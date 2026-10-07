import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { parseTimetablePDF, ParsedTimetableEntry, validateTimetableEntry, resolveTimetableSemester, PERIOD_TIMES } from '../utils/timetableParser';

const COURSE_TYPES = ['STANDALONE', 'INTEGRATED', 'PROJECT'] as const;
type CourseType = typeof COURSE_TYPES[number];

export async function ensureSubjectsForEntries(db: any, entries: ParsedTimetableEntry[]) {
  const codes = [...new Set(entries.map(entry => entry.subjectCode))];
  if (!codes.length) return { subjects: [], newlyCreatedCodes: new Set<string>() };

  const existing = await db.subject.findMany({ where: { code: { in: codes } }, select: { code: true } });
  const existingCodes = new Set(existing.map((subject: any) => subject.code));

  await db.subject.createMany({
    data: codes.map(code => ({ code, name: code })),
    skipDuplicates: true,
  });
  const subjects = await db.subject.findMany({ where: { code: { in: codes } } });
  return { subjects, newlyCreatedCodes: new Set(codes.filter(code => !existingCodes.has(code))) };
}

// Configure multer for file upload (reuse similar config as backlog controller)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are allowed for timetable import.'));
    }
  }
});

/**
 * Upload and parse timetable PDF
 * Returns preview data for validation
 */
export const parseTimetable = async (req: AuthRequest, res: Response) => {
  try {
    // Run multer middleware
    upload.single('file')(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ error: 'No timetable file uploaded' });
        }

        // Read the uploaded file
        const fileBuffer = await fs.promises.readFile(file.path);

        // Parse the timetable PDF
        const parsedEntries = await parseTimetablePDF(fileBuffer);

        // Create unknown official codes once; their course type remains explicitly pending.
        const { subjects, newlyCreatedCodes } = await ensureSubjectsForEntries(prisma, parsedEntries);

        // Validate every parsed entry for the import preview.
        const baseValidationResults = await Promise.all(
          parsedEntries.map(entry => validateTimetableEntry(entry, prisma))
        );
        const validationResults = baseValidationResults.map((result, index) => {
          const entry = parsedEntries[index];
          if (getSlotIndicesForTimeRange(entry.startTime, entry.endTime).length > 0) return result;

          return {
            ...result,
            valid: false,
            errors: [...result.errors, `Could not determine timetable slots for time range ${entry.startTime}-${entry.endTime}`],
          };
        });

        // Separate valid and invalid entries
        const invalidEntries = validationResults
          .flatMap((result, index) => result.valid ? [] : [{
            entry: parsedEntries[index],
            errors: result.errors,
            warnings: result.warnings || [],
          }]);
        const subjectsNeedingConfiguration = subjects
          .filter((subject: any) => subject.courseType === 'NEEDS_CONFIGURATION')
          .map((subject: any) => ({
            code: subject.code,
            name: subject.name,
            courseType: subject.courseType,
            isNew: newlyCreatedCodes.has(subject.code),
          }));

        // Clean up uploaded file
        await fs.promises.unlink(file.path);

        // Return preview data
        return res.status(200).json({
          totalEntries: parsedEntries.length,
          validCount: validationResults.filter(result => result.valid).length,
          invalidCount: invalidEntries.length,
          entries: parsedEntries,
          invalidEntries,
          subjectsNeedingConfiguration,
        });

      } catch (parseError) {
        console.error('Error parsing timetable:', parseError);
        // Clean up uploaded file if it exists
        const file = req.file as Express.Multer.File | undefined;
        if (file) {
          await fs.promises.unlink(file.path).catch(() => {}); // Ignore cleanup errors
        }
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        return res.status(400).json({ error: `Unable to parse timetable: ${errorMessage}` });
      }
    });
  } catch (error) {
    console.error('Error uploading timetable:', error);
    return res.status(500).json({ error: 'Internal server error while uploading timetable' });
  }
};

/**
 * Import validated timetable entries transactionally
 * Implements update/replace semantics: deletes existing slots for the same scope before inserting new ones
 */
export const importTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { entries, courseTypes = {} } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Timetable entries array is required' });
    }

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No timetable entries provided for import' });
    }
    if (!courseTypes || typeof courseTypes !== 'object' || Array.isArray(courseTypes)) {
      return res.status(400).json({ error: 'Course type selections must be an object keyed by subject code' });
    }

    // Validate that all entries have the required fields
    const incompleteEntries = entries.filter((entry: any) => {
      return !entry.section ||
             !entry.semester ||
             !entry.room ||
             !entry.effectiveDate ||
             !entry.day ||
             !entry.startTime ||
             !entry.endTime ||
             !entry.subjectCode ||
             !entry.activityType;
    });

    if (incompleteEntries.length > 0) {
      return res.status(400).json({
        error: 'Some timetable entries are missing required fields',
        invalidCount: incompleteEntries.length
      });
    }

    const allCodes = [...new Set(entries.map((entry: ParsedTimetableEntry) => entry.subjectCode))];
    const { subjects } = await ensureSubjectsForEntries(prisma, entries);
    const needsConfiguration = subjects.filter((subject: any) => subject.courseType === 'NEEDS_CONFIGURATION');
    const configurationErrors = needsConfiguration.flatMap((subject: any) => {
      const selected = courseTypes[subject.code];
      return COURSE_TYPES.includes(selected) ? [] : [subject.code];
    });
    const unknownSelections = Object.keys(courseTypes).filter(code => !allCodes.includes(code));
    if (configurationErrors.length || unknownSelections.length || Object.values(courseTypes).some((value: any) => !COURSE_TYPES.includes(value))) {
      return res.status(400).json({
        error: 'Course type configuration is incomplete or invalid',
        subjectsNeedingConfiguration: needsConfiguration.map((subject: any) => ({ code: subject.code, name: subject.name })),
        missingCourseTypes: configurationErrors,
        unknownSubjectCodes: unknownSelections,
      });
    }

    // Validate the entire timetable before opening the replacement transaction.
    const validationResults = await Promise.all(entries.map((entry: ParsedTimetableEntry) => validateTimetableEntry(entry, prisma)));
    const invalidEntries = validationResults.flatMap((result, index) => result.valid ? [] : [{
      entry: entries[index],
      errors: result.errors,
      warnings: result.warnings || [],
    }]);
    if (invalidEntries.length) {
      return res.status(422).json({ error: 'Timetable validation failed; existing timetable was not changed', invalidEntries });
    }

    const validEntries = validationResults.map(result => result.entry as ParsedTimetableEntry);
    const firstEntry = validEntries[0];
    const semester = await resolveTimetableSemester(prisma, firstEntry.semester, firstEntry.effectiveDate);
    if (!semester) return res.status(422).json({ error: `Semester not found: ${firstEntry.semester}` });

    const sectionName = firstEntry.section;
    const mismatchedScope = validEntries.some(entry => entry.section !== sectionName || entry.semester !== firstEntry.semester);
    if (mismatchedScope) return res.status(400).json({ error: 'All entries must belong to the same semester and section' });

    const batchYearRecord = await prisma.studentEnrollment.findFirst({
      where: { semesterId: semester.id, classGroup: sectionName },
      select: { student: { select: { batchStartYear: true } } },
    });
    const batchYear = batchYearRecord?.student?.batchStartYear ?? null;
    const entriesWithSlots = validEntries.map(entry => ({ entry, slotIndices: getSlotIndicesForTimeRange(entry.startTime, entry.endTime) }));
    const invalidSlotRange = entriesWithSlots.find(item => item.slotIndices.length === 0);
    if (invalidSlotRange) {
      return res.status(422).json({
        error: `Could not determine timetable slots for time range ${invalidSlotRange.entry.startTime}-${invalidSlotRange.entry.endTime}`,
      });
    }
    const occupiedSlots = new Set<string>();
    for (const { entry, slotIndices } of entriesWithSlots) {
      for (const slotIndex of slotIndices) {
        const key = `${entry.day}|${slotIndex}`;
        if (occupiedSlots.has(key)) {
          return res.status(422).json({ error: `Multiple timetable entries target ${entry.day} period ${slotIndex + 1}` });
        }
        occupiedSlots.add(key);
      }
    }

    const result = await prisma.$transaction(async (tx: any) => {
      for (const subject of needsConfiguration) {
        await tx.subject.update({
          where: { code: subject.code },
          data: { courseType: courseTypes[subject.code] as CourseType },
        });
      }

      await tx.timetableSlot.deleteMany({
        where: { semesterId: semester.id, classGroup: sectionName, batchYear },
      });

      let importedCount = 0;
      for (const { entry, slotIndices } of entriesWithSlots) {
        for (const slotIndex of slotIndices) {
          await tx.timetableSlot.create({
            data: {
              day: entry.day,
              slotIndex,
              subjectCode: entry.subjectCode,
              room: entry.room,
              classGroup: entry.section,
              teacherId: entry.facultyUserIds?.[0] || entry.facultyNames?.[0] || entry.facultyId || 'UNASSIGNED',
              coTeacherId: entry.facultyUserIds?.[1] || entry.facultyNames?.[1] || entry.coFacultyIds?.[0] || null,
              activityType: entry.activityType,
              semesterId: semester.id,
              batchYear,
              assignmentId: null,
            },
          });
        }
        importedCount += 1;
      }
      return { importedCount, skippedCount: 0 };
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error importing timetable:', error);
    return res.status(500).json({ error: 'Internal server error while importing timetable' });
  }
};

/**
 * Helper function to convert time range to slot index
 */
function getSlotIndexFromTimeRange(startTime: string, endTime: string): number | null {
  for (let i = 0; i < PERIOD_TIMES.length; i++) {
    const [periodStart, periodEnd] = PERIOD_TIMES[i];

    // Skip break/lunch periods
    if (!periodStart || !periodEnd) {
      continue;
    }

    if (periodStart === startTime && periodEnd === endTime) {
      return i;
    }
  }

  return null;
}

function getSlotIndicesForTimeRange(startTime: string, endTime: string): number[] {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return [];

  const covered = PERIOD_TIMES.flatMap(([start, end], index) => {
    if (!start || !end) return [];
    const periodStart = timeToMinutes(start)!;
    const periodEnd = timeToMinutes(end)!;
    return periodStart >= startMinutes && periodEnd <= endMinutes ? [{ index, periodStart, periodEnd }] : [];
  });
  if (!covered.length || covered[0].periodStart !== startMinutes || covered[covered.length - 1].periodEnd !== endMinutes) return [];
  if (covered.some((period, index) => index > 0 && covered[index - 1].periodEnd !== period.periodStart)) return [];
  return covered.map(period => period.index);
}

function timeToMinutes(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
