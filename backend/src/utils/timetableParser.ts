import * as fs from 'fs';
import * as path from 'path';
import { parsePDF } from './fileParser';
import { ocrPDF } from './ocr.service';

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
  facultyNames?: string[]; // Faculty names explicitly listed in the PDF course table
  coFacultyIds?: string[];
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
export function extractSemesterInfo(text: string): { semester: string; section: string; effectiveDate: string; room: string } | null {
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

  const roomPatterns = [
    /Room\s*Number[\s:-]*(\S+)/i,
    /Room[\s:-]*(\S+)/i,
    /[\s-]Room[\s:-]*(\S+)/i
  ];

  let semester = null;
  let section = null;
  let effectiveDate = null;
  let room = null;

  const explicitSection = text.match(/SECTION\s*:\s*\(?\s*([A-Z0-9]+)\s*\)?/i);
  const semesterHeader = text.match(/SEMESTER\s+([IVXLCDM]+)(?:\s*\(\s*(ODD|EVEN)\s*\))?/i);
  const yearRange = text.match(/Time\s+Table\s+for[\s\S]*?(\d{4}-\d{2})/i);
  const effectiveDateHeader = text.match(/Wef:\s*(\d{1,2})-(\d{1,2})-(\d{4})/i);
  const roomHeader = text.match(/Room\s+Number\s*:\s*([A-Z0-9]+(?:\s+\d+)?)/i);

  // Extract semester
  if (semesterHeader) {
    const romanValue = romanToNumber(semesterHeader[1]);
    semester = semesterHeader[2] && yearRange
      ? `${semesterHeader[2][0].toUpperCase()}${semesterHeader[2].slice(1).toLowerCase()} sem ${yearRange[1]}`
      : `Sem${romanValue}`;
  }
  for (const pattern of semesterPatterns) {
    if (semester) break;
    const match = text.match(pattern);
    if (match) {
      semester = `Sem${match[1]}`;
      break;
    }
  }
  // If the header has no usable semester, infer its level from subject-code
  // structure: optional leading digits, an alphabetic prefix, then a digit.
  // For example, BCS502 -> 5 and 1BCS304 -> 3.
  if (!semester) {
    const subjectSemester = text.match(/\b\d*[A-Z]{2,}(\d)\d[A-Z0-9]*\b/i);
    if (subjectSemester) semester = `Sem${subjectSemester[1]}`;
  }

  // Extract section
  if (explicitSection) {
    section = explicitSection[1].trim().toUpperCase();
  }
  for (const pattern of sectionPatterns) {
    if (section) break;
    const match = text.match(pattern);
    if (match) {
      section = match[1].toUpperCase();
      break;
    }
  }

  // Extract effective date
  if (effectiveDateHeader) {
    effectiveDate = `${effectiveDateHeader[3]}-${effectiveDateHeader[2].padStart(2, '0')}-${effectiveDateHeader[1].padStart(2, '0')}`;
  }
  for (const pattern of datePatterns) {
    if (effectiveDate) break;
    const match = text.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD format
        effectiveDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else if (match[3].length === 4) {
        // Slash dates are treated as MM/DD/YYYY; hyphen dates are DD-MM-YYYY.
        const isHyphenDate = match[0].includes('-');
        const month = isHyphenDate ? match[2] : match[1];
        const day = isHyphenDate ? match[1] : match[2];
        effectiveDate = `${match[3]}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      break;
    }
  }

  // Extract room
  if (roomHeader) {
    room = roomHeader[1].trim().replace(/\s+/g, ' ');
  }
  for (const pattern of roomPatterns) {
    if (room) break;
    const match = text.match(pattern);
    if (match) {
      room = match[1].trim();
      // Clean up common room format issues
      room = room.replace(/\s+/g, ''); // Remove spaces
      break;
    }
  }

  if (semester && section && effectiveDate && room) {
    return { semester, section, effectiveDate, room };
  }

  return null;
}

function romanToNumber(value: string): number {
  const numerals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  let previous = 0;
  for (const character of value.toUpperCase().split('').reverse()) {
    const current = numerals[character] || 0;
    total += current < previous ? -current : current;
    previous = current;
  }
  return total;
}

function to24HourTime(value: string): string {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  // Timetable headers use 1–7 for afternoon hours and 8–12 for morning/noon.
  const normalizedHour = hour >= 1 && hour <= 7 ? hour + 12 : hour;
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isSubjectCell(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9&/-]*(?:\s*\([A-Z]+\))?$/.test(normalized) && /[A-Z]/.test(normalized);
}

async function parseTimetablePdfByPosition(fileBuffer: Buffer): Promise<ParsedTimetableEntry[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
  const allItems: Array<{ text: string; x: number; y: number; width: number }> = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items as Array<any>) {
      if (typeof item.str === 'string' && item.str.trim()) {
        allItems.push({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
        });
      }
    }
  }

  const fullText = allItems.map(item => item.text).join(' ');
  const headerInfo = extractSemesterInfo(fullText);
  const timeItems = allItems
    .filter(item => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(item.text))
    .sort((left, right) => left.x - right.x);
  const dayItems = allItems
    .filter(item => /^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i.test(item.text))
    .sort((left, right) => right.y - left.y);

  console.debug('[timetable-parser] positional stages', {
    extractedText: fullText,
    headerInfo,
    timeColumns: timeItems.map(item => item.text),
    dayRows: dayItems.map(item => item.text),
    candidateCells: allItems.filter(item => isSubjectCell(item.text)).map(item => item.text),
    normalizedSubjects: allItems.filter(item => isSubjectCell(item.text)).map(item => ({
      raw: item.text,
      ...normalizeSubjectCodeAndActivity(item.text),
    })),
  });

  if (!headerInfo || timeItems.length < 2 || dayItems.length === 0) {
    return [];
  }

  const columnCenters = timeItems.map(item => ({
    label: item.text,
    center: item.x + item.width / 2,
  }));
  // The lower course/faculty table supplies the canonical code for merged lab
  // cells whose timetable label contains the course name instead of its code.
  const courseCodeHeaders = allItems.filter(item => /^Course code$/i.test(item.text)).sort((a, b) => a.x - b.x);
  const facultyHeaders = allItems.filter(item => /^Name of Faculty$/i.test(item.text)).sort((a, b) => a.x - b.x);
  const courseMappings = allItems.flatMap(codeItem => {
    const rawCode = codeItem.text.replace(/^\((.+)\)$/, '$1').trim();
    const canonicalCode = normalizeSubjectCodeAndActivity(rawCode).subjectCode;
    if (!/^\d*[A-Z]{2,}[A-Z0-9]*$/i.test(canonicalCode) || !/\d/.test(canonicalCode)) return [];
    const priorHeaders = courseCodeHeaders.filter(header => header.x <= codeItem.x + 5);
    const codeHeader = priorHeaders[priorHeaders.length - 1];
    if (!codeHeader || codeItem.y >= codeHeader.y || codeItem.y < codeHeader.y - 140) return [];
    const facultyHeader = facultyHeaders.find(header => header.x > codeHeader.x);
    if (!facultyHeader) return [];
    const names = allItems
      .filter(item => item.x > codeHeader.x && item.x < facultyHeader.x && Math.abs(item.y - codeItem.y) <= 16)
      .sort((a, b) => b.y - a.y)
      .map(item => item.text);
    const facultyNames = allItems
      .filter(item => item.x >= facultyHeader.x && item.x < facultyHeader.x + 200 && Math.abs(item.y - codeItem.y) <= 16)
      .sort((a, b) => b.y - a.y)
      .map(item => item.text.replace(/\s*\+\s*$/, '').trim())
      .filter(Boolean);
    return [{ code: rawCode, canonicalCode, name: names.join(' ').trim(), facultyNames: [...new Set(facultyNames)] }];
  });
  const timetableMinY = Math.min(...dayItems.map(item => item.y)) - 18;
  const timetableMaxY = Math.max(...dayItems.map(item => item.y)) + 18;
  const rowBoundaries = dayItems.map((day, index) => ({
    day: day.text[0].toUpperCase() + day.text.slice(1).toLowerCase(),
    minY: index === dayItems.length - 1 ? timetableMinY : (day.y + dayItems[index + 1].y) / 2,
    maxY: index === 0 ? timetableMaxY : (day.y + dayItems[index - 1].y) / 2,
  }));

  const entries: ParsedTimetableEntry[] = [];
  for (const row of rowBoundaries) {
    const rowItems = allItems.filter(item =>
      item.y >= row.minY &&
      item.y <= row.maxY &&
      item.x > columnCenters[0].center - 45 &&
      (isSubjectCell(item.text) || /\bPROJECT\b|\bCOMPUTER LAB\b|^[A-Z0-9]+\s+LAB\b/i.test(item.text)),
    );

    for (const item of rowItems) {
      const cellCenter = item.x + item.width / 2;
      let span: [number, number] | null = null;
      for (let start = 0; start < columnCenters.length; start += 1) {
        for (let end = start + 1; end < columnCenters.length; end += 1) {
          const spanCenter = (columnCenters[start].center + columnCenters[end].center) / 2;
          const spanWidth = columnCenters[end].center - columnCenters[start].center;
          const wideSpanHasTextEvidence = end - start <= 1 || item.width >= spanWidth * 0.5;
          if (Math.abs(spanCenter - cellCenter) <= 9 && wideSpanHasTextEvidence && (!span || end - start < span[1] - span[0])) {
            span = [start, end];
          }
        }
      }
      if (!span) {
        const nearest = columnCenters.reduce((closest, candidate, index) =>
          Math.abs(candidate.center - cellCenter) < Math.abs(columnCenters[closest].center - cellCenter)
            ? index
            : closest,
        0);
        span = [nearest, nearest];
      }

      const [firstStart] = columnCenters[span[0]].label.split('-');
      const [, lastEnd] = columnCenters[span[1]].label.split('-');
      const rawStart = firstStart;
      const rawEnd = lastEnd;
      const startTime = to24HourTime(rawStart);
      const endTime = to24HourTime(rawEnd);
      const spanIsClassTime = columnCenters.slice(span[0], span[1] + 1).every(column => {
        const [periodStart, periodEnd] = column.label.split('-').map(to24HourTime);
        return getSlotIndexFromTimeRange(periodStart, periodEnd) !== null;
      });
      if (!spanIsClassTime) continue;

      const subjectLabel = item.text.trim();
      let subjectCode: string;
      let activityType: string;
      const explicitLab = subjectLabel.match(/^([A-Z0-9][A-Z0-9&/-]*)\s+Lab\b/i);
      const mappedLab = courseMappings.find(course => {
        const root = course.name.replace(/\s+Lab\s*$/i, '').trim();
        return /\s+Lab\s*$/i.test(course.name) && subjectLabel.toUpperCase().startsWith(`${root.toUpperCase()} `);
      });
      if (explicitLab) {
        subjectCode = explicitLab[1].toUpperCase();
        activityType = 'LAB';
      } else if (mappedLab) {
        subjectCode = mappedLab.code.toUpperCase();
        activityType = 'LAB';
      } else if (/^MINI\s+PROJECT$/i.test(subjectLabel)) {
        subjectCode = subjectLabel.toUpperCase();
        activityType = 'PROJECT';
      } else {
        const normalized = normalizeSubjectCodeAndActivity(subjectLabel);
        subjectCode = normalized.subjectCode;
        activityType = normalized.activityType || 'THEORY';
      }
      const mappedCourse = courseMappings.find(course => {
        const mapped = normalizeSubjectCodeAndActivity(course.code);
        return course.canonicalCode === subjectCode && (!mapped.activityType || mapped.activityType === activityType);
      }) || courseMappings.find(course => course.canonicalCode === subjectCode);
      entries.push({
        section: headerInfo.section,
        semester: headerInfo.semester,
        room: headerInfo.room,
        effectiveDate: headerInfo.effectiveDate,
        day: row.day,
        startTime,
        endTime,
        subjectCode,
        activityType,
        facultyNames: mappedCourse?.facultyNames,
        facultyId: undefined,
      });
    }
  }

  console.debug('[timetable-parser] final positional entries', entries);

  // Merge consecutive entries in the same day with the same subject and activity type
  const entriesByDay: Record<string, ParsedTimetableEntry[]> = {};
  for (const entry of entries) {
    if (!entriesByDay[entry.day]) {
      entriesByDay[entry.day] = [];
    }
    entriesByDay[entry.day].push(entry);
  }

  const mergedEntries: ParsedTimetableEntry[] = [];
  for (const day in entriesByDay) {
    const dayEntries = entriesByDay[day];
    // Sort by startTime
    dayEntries.sort((a, b) => {
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });

    let i = 0;
    while (i < dayEntries.length) {
      let current = dayEntries[i];
      let j = i + 1;
      while (j < dayEntries.length) {
        const next = dayEntries[j];
        if (current.subjectCode === next.subjectCode &&
            current.activityType === next.activityType &&
            current.room === next.room &&
            current.endTime === next.startTime) {
          // Merge
          current = {
            ...current,
            endTime: next.endTime,
          };
          j++;
        } else {
          break;
        }
      }
      mergedEntries.push(current);
      i = j;
    }
  }

  console.debug('[timetable-parser] merged entries', mergedEntries);
  return mergedEntries;
}

/**
 * Normalizes subject code and extracts activity type
 * We do not alter the subject code string; we only trim and uppercase it.
 * The activity type is left undefined and must be provided by other means.
 */
/**
 * Normalizes subject code and extracts activity type from explicit parentheses notation.
 * Does not alter or infer subject code characters.
 *
 * Examples:
 *   "BCS502 (T)" → { subjectCode: "BCS502", activityType: "THEORY" }
 *   "BCS502 (L)" → { subjectCode: "BCS502", activityType: "LAB" }
 *   "1BMATCS301" → { subjectCode: "1BMATCS301", activityType: undefined }
 */
export function normalizeSubjectCodeAndActivity(codeWithActivity: string): { subjectCode: string; activityType: string | undefined } {
  const cleaned = codeWithActivity.trim().toUpperCase();

  // Pattern for activity type in parentheses: code followed by whitespace and parentheses
  const match = cleaned.match(/^([^()]+?)\s*\(([^)]+)\)$/);
  if (match) {
    const code = match[1].trim(); // Remove any spaces between code and opening parenthesis
    const activityInParens = match[2].toUpperCase();

    let activityType: string | undefined;
    switch (activityInParens) {
      case 'T':
        activityType = 'TUTORIAL';
        break;
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
      case 'P':
      case 'PRACTICAL':
        activityType = 'PRACTICAL';
        break;
      default:
        // If unknown activity type in parentheses, we still treat it as provided but unknown.
        // The import controller will likely error, but we preserve the exact string.
        activityType = activityInParens; // Keep the raw string from parentheses
    }

    return { subjectCode: code, activityType };
  }

  // No explicit activity notation: treat whole string as subject code, activity type unknown
  return { subjectCode: cleaned, activityType: undefined };
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
 * Helper function to convert time range to slot index
 */
export function getSlotIndexFromTimeRange(startTime: string, endTime: string): number | null {
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

/**
 * Resolve a parsed semester label to the academic term record used by timetable slots.
 * Generic labels such as "Sem5" describe a course level, so use the timetable's
 * effective date to find the stored academic term instead of treating it as a term name.
 */
export async function resolveTimetableSemester(prisma: any, semesterName: string, effectiveDate?: string): Promise<any | null> {
  const exactMatch = await prisma.semester.findFirst({
    where: {
      OR: [
        { name: semesterName },
        { name: { contains: semesterName } },
      ],
    },
  });
  if (exactMatch) return exactMatch;
  if (!/^Sem\d+$/i.test(semesterName)) return null;

  const activeSemesters = await prisma.semester.findMany({ where: { status: 'ACTIVE' } });
  if (effectiveDate) {
    const dateMatch = activeSemesters.find((semester: any) =>
      (!semester.startDate || semester.startDate <= effectiveDate) &&
      (!semester.endDate || semester.endDate >= effectiveDate),
    );
    if (dateMatch) return dateMatch;
  }

  return activeSemesters.length === 1 ? activeSemesters[0] : null;
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
    throw new Error('Could not extract semester, section, effective date, or room from timetable');
  }

  const { semester, section, effectiveDate, room: headerRoom } = headerInfo;

  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Table parser - handles multiple formats:
  // Format 1 (original): Day SlotIndex Subject Room Faculty
  // Format 2 (new): Day
  //                 HH:mm-HH:mm Subject
  //                 HH:mm-HH:mm Subject
  // ...

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let currentDay: string | null = null;

  for (const line of lines) {
    // Check if line contains a day name (handles cases like "Monday:" or "Monday")
    const dayMatch = line.match(new RegExp(`^(${dayNames.join('|')}):?$`, 'i'));
    if (dayMatch) {
      currentDay = dayMatch[1]; // Extract just the day name without colon
      continue;
    }

    // Skip if we don't have a current day
    if (!currentDay) continue;

    // Try to parse as time range format: HH:mm-HH:mm Subject [Room] [Faculty]
    const parts = line.split(/\s+/).filter(part => part.length > 0);

    if (parts.length >= 2) {
      const timeRangeStr = parts[0];
      const subjectWithActivity = parts[1];

      // Check if timeRangeStr matches HH:mm-HH:mm format
      const timeRangeMatch = timeRangeStr.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (timeRangeMatch) {
        const startTime = timeRangeMatch[1];
        const endTime = timeRangeMatch[2];

        // Convert time range to slot index to validate it's a known period
        const slotIndex = getSlotIndexFromTimeRange(startTime, endTime);
        if (slotIndex !== null) {
          const { subjectCode, activityType } = normalizeSubjectCodeAndActivity(subjectWithActivity);

          // Use header room (assumed constant for timetable) - could be overridden if room is in line
          const roomFromLine = parts.length >= 3 ? parts[2] : undefined;
          const finalRoom = roomFromLine || headerRoom;

          entries.push({
            section,
            semester,
            room: finalRoom,
            effectiveDate,
            day: currentDay,
            startTime,
            endTime,
            subjectCode,
            activityType: activityType || 'THEORY',
            facultyId: undefined // Would be resolved during validation
          });
          continue; // Skip further processing for this line
        }
      }
    }

    // Fallback to original format: [slotIndex] [subjectWithActivity] [room] [facultyName]
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
            activityType: activityType || 'THEORY',
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
    // Prefer positioned parsing so timetable cells can be joined to the
    // separately printed code/course/faculty mapping table.
    const positionalEntries = await parseTimetablePdfByPosition(fileBuffer);
    if (positionalEntries.length > 0) {
      return positionalEntries;
    }

    // First try regular PDF text extraction
    const pdfText = await parsePDF(fileBuffer);

    // Parse the extracted text
    const entries = await parseTimetableText(pdfText);

    // If we got entries, return them
    if (entries.length > 0) {
      return entries;
    }

    // If no entries found with regular text, try OCR approach for better positional data
    // This helps with complex table layouts where text extraction loses structure
    const ocrResult = await ocrPDF(fileBuffer);

    // Reconstruct text from OCR blocks preserving some spatial information
    // We'll use the blocksToText function from OCR service but modified for our needs
    let ocrText = '';
    for (const page of ocrResult.pages) {
      if (page.blocks && Array.isArray(page.blocks)) {
        // Sort blocks by vertical position (top to bottom), then horizontal (left to right)
        const sortedBlocks = [...page.blocks].sort((a, b) => {
          // First sort by Y coordinate (top to bottom)
          if (a.bbox[1] !== b.bbox[1]) {
            return a.bbox[1] - b.bbox[1];
          }
          // If same Y, sort by X coordinate (left to right)
          return a.bbox[0] - b.bbox[0];
        });

        // Group into lines based on Y proximity
        const lines: any[][] = [];
        const lineTolerance = 10; // pixels

        for (const block of sortedBlocks) {
          if (lines.length === 0) {
            lines.push([block]);
            continue;
          }

          const lastLine = lines[lines.length - 1];
          const lastBlock = lastLine[lastLine.length - 1];

          // If block is close enough to last line vertically, add to same line
          if (Math.abs(block.bbox[1] - lastBlock.bbox[1]) <= lineTolerance) {
            lastLine.push(block);
          } else {
            // Start new line
            lines.push([block]);
          }
        }

        // Convert each line to text
        const lineTexts = lines.map(line =>
          line.map(block => block.text).join(' ')
        );

        ocrText += lineTexts.join('\n') + '\n';
      } else {
        ocrText += page.text + '\n';
      }
    }

    // Parse the OCR-derived text
    const ocrEntries = await parseTimetableText(ocrText);
    if (ocrEntries.length > 0) {
      return ocrEntries;
    }

    // If still no entries, return what we got from regular approach (empty array)
    return entries;
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
    const semester = await resolveTimetableSemester(prisma, entry.semester, entry.effectiveDate);

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

    // Find the class assignment when one already exists. Some timetable PDFs
    // carry the assignment details themselves in the course/faculty table.
    const assignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subjectId: subject.id,
        classGroup: entry.section
      }
    });

    const mappedFacultyIds: string[] = [];
    if (entry.facultyNames?.length) {
      const teachers = await prisma.user.findMany({ where: { role: 'teacher' }, select: { id: true, name: true } });
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
          errors.push(matches.length ? `Faculty name is ambiguous: ${facultyName}` : `Faculty not found: ${facultyName}`);
        } else {
          mappedFacultyIds.push(matches[0].id);
        }
      }
    }

    if (!assignment && mappedFacultyIds.length === 0) {
      errors.push(`No subject-section assignment found for subject ${entry.subjectCode} in section ${entry.section}`);
      return { valid: false, errors, warnings };
    }
    if (errors.length) return { valid: false, errors, warnings };

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
    let facultyId: string | undefined = mappedFacultyIds[0] || entry.facultyId;
    if (!facultyId && assignment) {
      facultyId = entry.activityType === 'LAB' ? assignment.labFacultyId || undefined : assignment.theoryFacultyId || undefined;
    }
    if (entry.facultyId && !mappedFacultyIds.length) {
      // If facultyId is already provided (maybe from lookup), use it
      facultyId = entry.facultyId;
    }

    return {
      valid: true,
      errors: [],
      warnings,
      entry: {
        ...entry,
        semester: semester.name,
        facultyId,
        coFacultyIds: mappedFacultyIds.slice(1),
      }
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error validating timetable entry:', err);
    errors.push(`Validation failed due to system error: ${err.message}`);
    return { valid: false, errors, warnings };
  }
}
