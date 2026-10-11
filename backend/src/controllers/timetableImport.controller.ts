import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import * as bcrypt from 'bcryptjs';
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

// Helper function to normalize faculty names for matching
export function normalizeFacultyName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase()
    .replace(/\\t/g, ' ')
    .replace(/\b(professor|prof|doctor|dr)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Helper function to calculate similarity between two normalized names
// Returns a score between 0 and 1, where 1 is exact match
export function similarityScore(a: string, b: string): number {
  const normA = normalizeFacultyName(a);
  const normB = normalizeFacultyName(b);
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // Token set Jaccard similarity
  const setA = new Set(normA.split(' '));
  const setB = new Set(normB.split(' '));
  if (setA.size === 0 || setB.size === 0) return 0.0;

  const intersection = [...setA].filter(token => setB.has(token)).length;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

// Function to find similar faculty members
export async function findSimilarFaculty(prisma: any, facultyName: string, limit: number = 5): Promise<Array<{id: string, name: string, department: string | undefined, classGroup: string | undefined}>> {
  const normalizedInput = normalizeFacultyName(facultyName);
  if (!normalizedInput) return [];

  // Fetch all faculty (users with role teacher, dean, principal, or hod)
  const faculty = await prisma.user.findMany({
    where: { role: { in: ['teacher', 'dean', 'principal', 'hod'] } },
    select: { id: true, name: true, department: true, classGroup: true }
  });

  // Score each faculty member
  const scored = faculty.map((member: { id: string; name: string; department: string | undefined; classGroup: string | undefined }) => {
    const normalizedName = normalizeFacultyName(member.name);
    const score = similarityScore(normalizedInput, normalizedName);
    return { ...member, score };
  });

  // Filter out zero score and sort by score descending
  const filtered = scored.filter((member: { score: number }) => member.score > 0.3); // threshold for similarity
  const sorted = filtered.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
  return sorted.slice(0, limit).map(({id, name, department, classGroup}: { id: string; name: string; department: string | undefined; classGroup: string | undefined }) => ({id, name, department, classGroup}));
}

// Function to validate a timetable entry for preview, including faculty resolution
export async function validateTimetableEntryForPreview(
  entry: ParsedTimetableEntry,
  prisma: any
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  entry: ParsedTimetableEntry;
  facultyResolution: {
    resolved: boolean;
    unresolvedNames: string[];
    suggestions: Record<string, Array<{id: string, name: string, department: string | undefined, classGroup: string | undefined}>>;
  };
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields (same as in validateTimetableEntry)
  if (!entry.section) errors.push('Section is required');
  if (!entry.semester) errors.push('Semester is required');
  if (!entry.room) errors.push('Room is required');
  if (!entry.effectiveDate) errors.push('Effective date is required');
  if (!entry.day) errors.push('Day is required');
  if (!entry.startTime) errors.push('Start time is required');
  if (!entry.endTime) errors.push('End time is required');
  if (!entry.subjectCode) errors.push('Subject code is required');
  if (!entry.activityType) errors.push('Activity type is required');

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      entry,
      facultyResolution: {
        resolved: false,
        unresolvedNames: [],
        suggestions: {}
      }
    };
  }

  // Validate day
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (!validDays.includes(entry.day)) {
    errors.push(`Invalid day: ${entry.day}. Must be one of: ${validDays.join(', ')}`);
  }

  // Validate time format (HH:mm)
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(entry.startTime)) {
    errors.push(`Invalid start time format: ${entry.startTime}. Expected HH:mm`);
  }
  if (!timeRegex.test(entry.endTime)) {
    errors.push(`Invalid end time format: ${entry.endTime}. Expected HH:mm`);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(entry.effectiveDate)) {
    errors.push(`Invalid effective date format: ${entry.effectiveDate}. Expected YYYY-MM-DD`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      entry,
      facultyResolution: {
        resolved: false,
        unresolvedNames: [],
        suggestions: {}
      }
    };
  }

  try {
    // Find the semester
    const semester = await resolveTimetableSemester(prisma, entry.semester, entry.effectiveDate);

    if (!semester) {
      errors.push(`Semester not found: ${entry.semester}`);
      return {
        valid: false,
        errors,
        warnings,
        entry,
        facultyResolution: {
          resolved: false,
          unresolvedNames: [],
          suggestions: {}
        }
      };
    }

    // Find the subject
    const subject = await prisma.subject.findFirst({
      where: {
        code: entry.subjectCode
      }
    });

    if (!subject) {
      errors.push(`Subject not found: ${entry.subjectCode}`);
      return {
        valid: false,
        errors,
        warnings,
        entry,
        facultyResolution: {
          resolved: false,
          unresolvedNames: [],
          suggestions: {}
        }
      };
    }

    // Faculty resolution logic (similar to validateTimetableEntry but returning unresolved info)
    const facultyUserIds: Array<string | null> = [];
    const unresolvedNames: string[] = [];
    if (entry.facultyNames?.length) {
      const teachers = await prisma.user.findMany({
        where: { role: { in: ['teacher', 'dean', 'principal', 'hod'] } },
        select: { id: true, name: true }
      });
      const normalizeName = (name: string) => name.toLowerCase()
        .replace(/\b(professor|prof|doctor|dr)\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      for (const facultyName of entry.facultyNames) {
        const requested = normalizeName(facultyName);
        const matches = teachers.filter((teacher: any) => {
          const known = new Set(normalizeName(teacher.name));
          return requested.length > 0 && requested.every(token => known.has(token));
        });
        if (matches.length !== 1) {
          facultyUserIds.push(null);
          unresolvedNames.push(facultyName);
          warnings.push(matches.length
            ? `Faculty name is ambiguous in teacher records; retaining PDF name: ${facultyName}`
            : `Faculty not found in teacher records; retaining PDF name: ${facultyName}`);
        } else {
          facultyUserIds.push(matches[0].id);
        }
      }
    }
    if (errors.length) return { valid: false, errors, warnings, entry, facultyResolution: { resolved: false, unresolvedNames: [], suggestions: {} } };

    // Generate suggestions for each unresolved name
    const suggestions: Record<string, Array<{id: string, name: string, department: string | undefined, classGroup: string | undefined}>> = {};
    for (const name of unresolvedNames) {
      suggestions[name] = await findSimilarFaculty(prisma, name);
    }

    // Determine if all faculty names are resolved
    const resolved = unresolvedNames.length === 0;

    // Try to find faculty by name if provided (for backward compatibility)
    let facultyId: string | undefined = facultyUserIds[0] || entry.facultyId;
    if (!facultyId) {
      // We would normally look up assignment here, but we skip for preview to avoid extra DB calls
      // In the import, we will use the resolved IDs from facultyUserIds
    }
    if (entry.facultyId && !facultyUserIds.some(Boolean)) {
      facultyId = entry.facultyId;
    }

    return {
      valid: true,
      errors: [],
      warnings,
      entry: {
        ...entry,
        // We add temporary fields for preview use; these will not be stored in the entry permanently
        // but we attach them to the entry object for convenience in the preview response
        facultyId,
        facultyUserIds,
        coFacultyIds: facultyUserIds.slice(1).filter((id): id is string => Boolean(id)),
      },
      facultyResolution: {
        resolved,
        unresolvedNames,
        suggestions
      }
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error validating timetable entry:', err);
    errors.push(`Validation failed due to system error: ${err.message}`);
    return {
      valid: false,
      errors,
      warnings,
      entry,
      facultyResolution: {
        resolved: false,
        unresolvedNames: [],
        suggestions: {}
      }
    };
  }
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

        // Validate every parsed entry for the import preview using our new preview validation
        const previewResults = await Promise.all(
          parsedEntries.map(entry => validateTimetableEntryForPreview(entry, prisma))
        );

        // Separate valid and invalid entries based on overall validation (including faculty resolution?)
        // We consider an entry invalid if it has validation errors (not related to faculty)
        const invalidEntries = previewResults
          .flatMap((result, index) => result.valid ? [] : [{
            entry: parsedEntries[index],
            errors: result.errors,
            warnings: result.warnings || [],
          }]);
        
        // Collect unresolved faculty across all entries
        const unresolvedFacultyMap: Record<string, {
          name: string;
          suggestions: Array<{id: string, name: string, department: string | undefined, classGroup: string | undefined}>;
        }> = {};
        
        for (const result of previewResults) {
          if (result.valid && result.facultyResolution) {
            for (const unresolvedName of result.facultyResolution.unresolvedNames) {
              if (!unresolvedFacultyMap[unresolvedName]) {
                unresolvedFacultyMap[unresolvedName] = {
                  name: unresolvedName,
                  suggestions: result.facultyResolution.suggestions[unresolvedName] || []
                };
              }
            }
          }
        }
        
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
          validCount: previewResults.filter(result => result.valid).length,
          invalidCount: invalidEntries.length,
          entries: previewResults.map(r => r.entry),
          invalidEntries,
          subjectsNeedingConfiguration,
          unresolvedFaculty: Object.values(unresolvedFacultyMap) // Array of unresolved faculty with suggestions
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
    const {
      entries,
      courseTypes = {},
      semesterId: requestedSemesterId,
      studentSemesterNumber,
      program,
      classGroup: requestedClassGroup,
      // We expect that the frontend has resolved faculty and provided the resolved entries
      // For simplicity, we assume the entries in the request body are the resolved entries
      // with facultyUserIds populated with resolved IDs or null for unassigned.
    } = req.body;
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Timetable entries array is required' });
    }
    
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No timetable entries provided for import' });
    }
    
    if (!requestedSemesterId || !studentSemesterNumber || studentSemesterNumber === "" || !Number.isInteger(Number(studentSemesterNumber)) || !program || !requestedClassGroup) {
      return res.status(400).json({ error: 'Selected semester, student semester, program, and section are required' });
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

    const pdfSection = entries[0].section;
    const pdfSemester = entries[0].semester;
    const mismatchedPdfScope = entries.some((entry: ParsedTimetableEntry) => entry.section !== pdfSection || entry.semester !== pdfSemester);
    if (mismatchedPdfScope) return res.status(400).json({ error: 'All entries must belong to the same PDF semester and section' });

    const semester = await resolveTimetableSemester(prisma, pdfSemester, entries[0].effectiveDate);
    if (!semester) return res.status(422).json({ error: `Semester not found: ${pdfSemester}` });
    if (semester.id !== String(requestedSemesterId)) {
      return res.status(422).json({ error: 'The selected academic semester does not match the semester in the PDF' });
    }

    const selectedEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        semesterId: semester.id,
        program: String(program),
        classGroup: String(requestedClassGroup),
      },
      select: { student: { select: { batchStartYear: true } } },
    });
    if (!selectedEnrollment) {
      return res.status(422).json({ error: 'The selected section is not enrolled in the selected semester and program' });
    }

    // The selected enrollment section is canonical; the PDF section is retained
    // separately for diagnostics and is never written to TimetableSlot.
    const canonicalEntries = entries.map((entry: ParsedTimetableEntry) => ({
      ...entry,
      pdfSection: entry.section,
      section: String(requestedClassGroup),
    }));

    // Validate the entire timetable against the canonical ERP class group before
    // opening the replacement transaction.
    // We use the original validateTimetableEntry because we assume faculty is already resolved.
    const validationResults = await Promise.all(canonicalEntries.map((entry: ParsedTimetableEntry) => validateTimetableEntry(entry, prisma)));
    const invalidEntries = validationResults.flatMap((result, index) => result.valid ? [] : [{
      entry: entries[index],
      errors: result.errors,
      warnings: result.warnings || [],
    }]);
    if (invalidEntries.length) {
      return res.status(422).json({ error: 'Timetable validation failed; existing timetable was not changed', invalidEntries });
    }

    const validEntries = validationResults.map(result => result.entry as ParsedTimetableEntry);
    const sectionName = String(requestedClassGroup);
    const batchYear = selectedEnrollment.student.batchStartYear ?? null;
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
        where: { semesterId: semester.id, classGroup: sectionName, studentSemesterNumber: Number(studentSemesterNumber) },
      });

      let importedCount = 0;
      for (const { entry, slotIndices } of entriesWithSlots) {
        for (const slotIndex of slotIndices) {
          // Use resolved faculty IDs; if null, use 'UNASSIGNED'
          const teacherId = entry.facultyUserIds?.[0] || 'UNASSIGNED';
          const coTeacherId = entry.facultyUserIds?.[1] || null;
          
          await tx.timetableSlot.create({
            data: {
              day: entry.day,
              slotIndex,
              subjectCode: entry.subjectCode,
              room: entry.room,
              classGroup: entry.section,
              teacherId,
              coTeacherId,
              activityType: entry.activityType,
              semesterId: semester.id,
              batchYear,
              studentSemesterNumber: Number(studentSemesterNumber),
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
 * Search for faculty similar to the given name
 */
export const searchFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Faculty name is required' });
    }
    const similar = await findSimilarFaculty(prisma, name, 10);
    return res.status(200).json({ similar });
  } catch (error) {
    console.error('Error searching faculty:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new faculty member
 */
export const createFaculty = async (req: AuthRequest, res: Response) => {
  try {
    // We'll reuse the register logic but set role to 'teacher'
    const { name, email, password, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    // Check if user with this email already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { email: email.toUpperCase() }
        ]
      }
    });
    if (existing) {
      return res.status(409).json({ error: `A user with email ${email} is already registered` });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'teacher',
        department: department || undefined,
        isActive: true,
        // Faculty-specific fields: batchStartYear, batchEndYear, numberOfBacklogs, backlogSubjects, program, classGroup, semesterId are not applicable or null
        batchStartYear: null,
        batchEndYear: null,
        numberOfBacklogs: 0,
        backlogSubjects: [],
        program: null,
        classGroup: null,
        semesterId: null,
      }
    });

    return res.status(201).json({
      message: 'Faculty created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
      }
    });
  } catch (error) {
    console.error('Error creating faculty:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
