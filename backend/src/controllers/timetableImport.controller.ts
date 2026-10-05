import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { parseTimetablePDF, ParsedTimetableEntry, validateTimetableEntry, resolveTimetableSemester, PERIOD_TIMES } from '../utils/timetableParser';

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

        // Validate each entry
        const validationResults = await Promise.all(
          parsedEntries.map(entry => validateTimetableEntry(entry, prisma))
        );

        // Separate valid and invalid entries
        const validEntries = validationResults
          .filter(result => result.valid)
          .map(result => result.entry as ParsedTimetableEntry);

        const invalidEntries = validationResults
          .filter(result => !result.valid)
          .map(result => ({
            entry: result.entry,
            errors: result.errors,
            warnings: result.warnings || []
          }));

        // Clean up uploaded file
        await fs.promises.unlink(file.path);

        // Return preview data
        return res.status(200).json({
          totalEntries: parsedEntries.length,
          validCount: validEntries.length,
          invalidCount: invalidEntries.length,
          validEntries,
          invalidEntries
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
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Timetable entries array is required' });
    }

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No timetable entries provided for import' });
    }

    // Validate that all entries have the required fields
    const invalidEntries = entries.filter((entry: any) => {
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

    if (invalidEntries.length > 0) {
      return res.status(400).json({
        error: 'Some timetable entries are missing required fields',
        invalidCount: invalidEntries.length
      });
    }

    // Process the import transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Determine the timetable scope from the first entry (all entries should have same scope)
      const firstEntry = entries[0];
      const semesterName = firstEntry.semester;
      const sectionName = firstEntry.section;

      // Find the semester
      const semester = await resolveTimetableSemester(tx, semesterName, firstEntry.effectiveDate);

      if (!semester) {
        throw new Error(`Semester not found: ${semesterName}`);
      }

      // Determine the batch year for this semester and section
      const batchYearRecord = await tx.studentEnrollment.findFirst({
        where: {
          semesterId: semester.id,
          classGroup: sectionName
        },
        select: {
          student: {
            select: {
              batchStartYear: true
            }
          }
        }
      });

      const batchYear = batchYearRecord?.student?.batchStartYear ?? null;

      // Delete all existing timetable slots for this semester, section, and batch year
      await tx.timetableSlot.deleteMany({
        where: {
          semesterId: semester.id,
          classGroup: sectionName,
          batchYear: batchYear
        }
      });

      let importedCount = 0;
      let skippedCount = 0;
      const validationErrors: any[] = [];

      for (const entry of entries) {
        try {
          // Validate each entry again (defense in depth)
          const validationResult = await validateTimetableEntry(entry, tx);

          if (!validationResult.valid) {
            validationErrors.push({
              entry,
              errors: validationResult.errors,
              warnings: validationResult.warnings || []
            });
            skippedCount++;
            continue;
          }

          const validEntry = validationResult.entry as ParsedTimetableEntry;

          // Find the subject
          const subject = await tx.subject.findFirst({
            where: {
              code: validEntry.subjectCode
            }
          });

          if (!subject) {
            validationErrors.push({
              entry: validEntry,
              errors: [`Subject not found: ${validEntry.subjectCode}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Find or create the class assignment. PDF course tables provide the
          // faculty mapping when no assignment has previously been configured.
          let assignment = await tx.subjectSectionAssignment.findFirst({
            where: {
              subjectId: subject.id,
              classGroup: validEntry.section!
            }
          });

          const slotIndices = getSlotIndicesForTimeRange(validEntry.startTime, validEntry.endTime);
          if (slotIndices.length === 0) {
            validationErrors.push({
              entry: validEntry,
              errors: [`Could not determine timetable slots for time range ${validEntry.startTime}-${validEntry.endTime}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          if (!assignment && validEntry.facultyId) {
            assignment = await tx.subjectSectionAssignment.create({
              data: {
                subjectId: subject.id,
                classGroup: validEntry.section!,
                theoryFacultyId: validEntry.activityType === 'LAB' ? null : validEntry.facultyId,
                labFacultyId: validEntry.activityType === 'LAB' ? validEntry.facultyId : null,
              }
            });
          }
          if (!assignment) {
            validationErrors.push({
              entry: validEntry,
              errors: [`No subject-section assignment or PDF faculty mapping found for subject ${validEntry.subjectCode} in section ${validEntry.section}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Check for conflicts (existing timetable slot for same section, day, slot, semester)
          // First we need to convert time range to slot index
          // Create the timetable slot
          // Determine faculty ID based on activity type
          let facultyId: string | null = null;
          if (validEntry.activityType === 'LAB') {
            facultyId = validEntry.facultyId || assignment.labFacultyId;
          } else if (validEntry.activityType === 'THEORY' || validEntry.activityType === 'TUTORIAL' || validEntry.activityType === 'PRACTICAL' || validEntry.activityType === 'PROJECT') {
            facultyId = validEntry.facultyId || assignment.theoryFacultyId;
          } else {
            // If activity type is not recognized, we cannot determine which faculty to use.
            throw new Error(`Unrecognized activity type "${validEntry.activityType}" for timetable entry. Entry: ${JSON.stringify(validEntry)}`);
          }

          if (!facultyId) {
            throw new Error(`No faculty assigned for ${validEntry.activityType} in assignment ${assignment.id}`);
          }

          // Create the timetable slot
          for (const slotIndex of slotIndices) {
            await tx.timetableSlot.create({
              data: {
                day: validEntry.day,
                slotIndex,
                assignmentId: assignment.id,
                room: validEntry.room,
                classGroup: validEntry.section!,
                teacherId: facultyId,
                coTeacherId: validEntry.coFacultyIds?.[0] || null,
                activityType: validEntry.activityType,
                semesterId: semester.id,
                batchYear: batchYear
              }
            });
          }

          importedCount++;
        } catch (entryError: any) {
          console.error('Error processing timetable entry:', entryError);
          validationErrors.push({
            entry,
            errors: [`Failed to process entry: ${entryError.message}`],
            warnings: []
          });
          skippedCount++;
        }
      }

      return {
        importedCount,
        skippedCount,
        validationErrors
      };
    });

    return res.status(200).json({
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      validationErrors: result.validationErrors
    });

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
