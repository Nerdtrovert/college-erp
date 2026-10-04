import * as fs from 'fs';
import * as path from 'path';
import { parsePDF } from './fileParser';

// Interface for parsed timetable entry
export interface ParsedTimetableEntry {
  section: string;
  semester: string;
  room: string;
  effectiveDate: string; // YYYY-MM-DD format
  day: string; // Monday, Tuesday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  subjectCode: string; // Normalized subject code (e.g., BCS502)
  activityType: string; // THEORY, LAB, TUTORIAL
  facultyId?: string; // Optional faculty ID
}

// Interface for validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entry?: ParsedTimetableEntry;
}

// Period times matching the timetable system
export const PERIOD_TIMES = [
  ['08:30', '09:30'], // Period 0
  ['09:30', '10:30'], // Period 1
  [null, null],       // Break (no class)
  ['11:00', '12:00'], // Period 2
  ['12:00', '13:00'], // Period 3
  [null, null],       // Lunch (no class)
  ['13:45', '14:45'], // Period 4
  ['14:45', '15:45'], // Period 5
];

/**
 * Extracts semester information from text
 */
export function extractSemesterInfo(text: string): { semester: string; section: string; effectiveDate: string } | null {
  // Common patterns for timetable headers
  const semesterPatterns = [
    /(?:Semester|SEM)[\s:-]*(\d+)/i,
    /(?:Odd|Even)\s*sem[\s:-]*(\d+)/i,
    /Sem[\s:-]*(\d+)/i
  ];

  const sectionPatterns = [
    /(?:Section|SEC|Sec)[\s:-]*([A-Z])/i,
    /[\s-]([A-Z])[\s-]/, // Section like -B- in filename
    /Section[\s:-]*([A-Z])\b/i
  ];

  const datePatterns = [
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // YYYY-MM-DD
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // MM/DD/YYYY or DD/MM/YYYY
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/  // MM-DD-YYYY or DD-MM-YYYY
  ];

  let semester = null;
  let section = null;
  let effectiveDate = null;

  // Extract semester
  for (const pattern of semesterPatterns) {
    const match = text.match(pattern);
    if (match) {
      semester = `Sem${match[1]}`;
      break;
    }
  }

  // Extract section
  for (const pattern of sectionPatterns) {
    const match = text.match(pattern);
    if (match) {
      section = match[1].toUpperCase();
      break;
    }
  }

  // Extract effective date
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD format
        effectiveDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else if (match[3].length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY - assuming MM/DD/YYYY
        effectiveDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }
      break;
    }
  }

  if (semester && section && effectiveDate) {
    return { semester, section, effectiveDate };
  }

  return null;
}

/**
 * Normalizes subject code and extracts activity type
 * BCS502(T) → { code: 'BCS502', type: 'THEORY' }
 * BCS502(L) → { code: 'BCS502', type: 'LAB' }
 * BCS503(TUTO) → { code: 'BCS503', type: 'TUTORIAL' }
 */
export function normalizeSubjectCodeAndActivity(codeWithActivity: string): { subjectCode: string; activityType: string } {
  const cleaned = codeWithActivity.trim().toUpperCase();

  // Pattern for activity type in parentheses
  const activityMatch = cleaned.match(/^([A-Z0-9]+)\s*\(([^)]+)\)$/);
  if (activityMatch) {
    const baseCode = activityMatch[1];
    const activityInParens = activityMatch[2].toUpperCase();

    let activityType: string;
    switch (activityInParens) {
      case 'T':
      case 'THEORY':
        activityType = 'THEORY';
        break;
      case 'L':
      case 'LAB':
        activityType = 'LAB';
        break;
      case 'TUTO':
      case 'TUTORIAL':
        activityType = 'TUTORIAL';
        break;
      default:
        // Default to THEORY if unknown
        activityType = 'THEORY';
    }

    return { subjectCode: baseCode, activityType };
  }

  // If no activity type specified, default to THEORY
  return { subjectCode: cleaned, activityType: 'THEORY' };
}

/**
 * Converts slot index to time range
 */
export function slotIndexToTimeRange(slotIndex: number): { startTime: string; endTime: string } | null {
  if (slotIndex < 0 || slotIndex >= PERIOD_TIMES.length) {
    return null;
  }

  const [startTime, endTime] = PERIOD_TIMES[slotIndex];

  // Skip break/lunch periods
  if (!startTime || !endTime) {
    return null;
  }

  return { startTime, endTime };
}

/**
 * Parses timetable text to extract entries
 * This is a simplified parser - in reality would need to handle the actual PDF layout
 */
export async function parseTimetableText(text: string): Promise<ParsedTimetableEntry[]> {
  const entries: ParsedTimetableEntry[] = [];

  // Extract header info
  const headerInfo = extractSemesterInfo(text);
  if (!headerInfo) {
    throw new Error('Could not extract semester, section, or effective date from timetable');
  }

  const { semester, section, effectiveDate } = headerInfo;

  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Simple table parser - looks for patterns like:
  // Day Slot Subject Room Faculty
  // Monday 0 BCS502(T) B001 Prof. XYZ

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let currentDay: string | null = null;

  for (const line of lines) {
    // Check if line contains a day name
    const dayMatch = line.match(new RegExp(`^(${dayNames.join('|')})`, 'i'));
    if (dayMatch) {
      currentDay = dayMatch[0];
      continue;
    }

    // Skip if we don't have a current day
    if (!currentDay) continue;

    // Parse potential timetable entry
    // Expected format: [slotIndex] [subjectCode] [room] [facultyName]
    const parts = line.split(/\s+/).filter(part => part.length > 0);

    if (parts.length >= 3) {
      const slotIndexStr = parts[0];
      const subjectWithActivity = parts[1];
      const room = parts[2];
      const facultyName = parts.slice(3).join(' ') || undefined;

      const slotIndex = parseInt(slotIndexStr, 10);
      if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex <= 7) {
        const timeRange = slotIndexToTimeRange(slotIndex);
        if (timeRange) {
          const { subjectCode, activityType } = normalizeSubjectCodeAndActivity(subjectWithActivity);

          // In a real implementation, we would look up faculty ID by name
          // For now, we'll leave facultyId undefined and handle it in validation

          entries.push({
            section,
            semester,
            room,
            effectiveDate,
            day: currentDay,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            subjectCode,
            activityType,
            facultyId: undefined // Would be resolved during validation
          });
        }
      }
    }
  }

  return entries;
}

/**
 * Main function to parse timetable from PDF file
 */
export async function parseTimetablePDF(fileBuffer: Buffer): Promise<ParsedTimetableEntry[]> {
  try {
    // First try regular PDF text extraction
    const pdfText = await parsePDF(fileBuffer);

    // Parse the extracted text
    return await parseTimetableText(pdfText);
  } catch (error: unknown) {
    const err = error as Error;
    throw new Error(`Failed to parse timetable PDF: ${err.message}`);
  }
}

/**
 * Validates a timetable entry against existing Subject and SubjectSectionAssignment
 */
export async function validateTimetableEntry(
  entry: ParsedTimetableEntry,
  prisma: any
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
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
    return { valid: false, errors, warnings };
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

  // If we have basic validation errors, don't proceed to database checks
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  try {
    // Find the semester
    const semester = await prisma.semester.findFirst({
      where: {
        OR: [
          { name: entry.semester },
          { name: { contains: entry.semester } }
        ]
      }
    });

    if (!semester) {
      errors.push(`Semester not found: ${entry.semester}`);
      return { valid: false, errors, warnings };
    }

    // Find the subject
    const subject = await prisma.subject.findFirst({
      where: {
        code: entry.subjectCode
      }
    });

    if (!subject) {
      errors.push(`Subject not found: ${entry.subjectCode}`);
      return { valid: false, errors, warnings };
    }

    // Find the SubjectSectionAssignment
    const assignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subjectId: subject.id,
        classGroup: entry.section
      }
    });

    if (!assignment) {
      errors.push(`No subject-section assignment found for subject ${entry.subjectCode} in section ${entry.section}`);
      return { valid: false, errors, warnings };
    }

    // Validate activity type matches assignment
    const isLabSubject = await prisma.subject.count({
      where: {
        id: subject.id,
        type: 'INTEGRATED' // Assuming labs are integrated subjects or have some indicator
      }
    }) > 0;

    // For now, we'll accept any activity type if the assignment exists
    // In a more sophisticated system, we'd check if the assignment supports the activity type
    if (entry.activityType === 'LAB' && !isLabSubject) {
      warnings.push(`Subject ${entry.subjectCode} is not marked as a lab subject but activity type is LAB`);
    }

    // Try to find faculty by name if provided
    let facultyId: string | undefined = entry.facultyId;
    if (entry.facultyId) {
      // If facultyId is already provided (maybe from lookup), use it
      facultyId = entry.facultyId;
    } else if (entry.facultyId === undefined && typeof entry.facultyId !== 'undefined') {
      // Actually, we don't have faculty name in our parsed entry yet
      // This would need to be enhanced to extract faculty name and look it up
      // For now, we'll skip faculty validation
    }

    return {
      valid: true,
      errors: [],
      warnings,
      entry: {
        ...entry,
        facultyId
      }
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error validating timetable entry:', err);
    errors.push(`Validation failed due to system error: ${err.message}`);
    return { valid: false, errors, warnings };
  }
}