import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ParsedStudent {
  id: string;
  name: string;
  department: string;
  classGroup: string;
}

/**
 * Parse Excel file buffer and return sheet data as array of records
 */
export const parseExcel = (buffer: Buffer): any[] => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

/**
 * Parse Word (.docx) file buffer and return plain text
 */
export const parseWord = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

/**
 * Parse PDF file buffer and return plain text
 */
export const parsePDF = async (buffer: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
};

/**
 * Clean student details (remove labels, extra spaces, etc.)
 */
const cleanValue = (val: string): string => {
  return val
    .replace(/^(roll\s*no|roll\s*number|id|usn|name|department|dept|branch|section|class\s*group|classgroup|class|group|sec|roll\s*no:|roll\s*number:|id:|usn:|name:|department:|dept:|branch:|section:|class\s*group:|classgroup:|class:|group:|sec:)\s*/i, '')
    .trim();
};

/**
 * Intelligent parser to extract student objects from semi-structured text.
 * Handles key-value blocks, comma-separated values, tab-separated tables, etc.
 */
export const extractStudentsFromText = (text: string): ParsedStudent[] => {
  const students: ParsedStudent[] = [];
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Strategy 1: Check if it is a block-style list (Key: Value on separate lines)
  // e.g.
  // Roll: CS21B001
  // Name: Rehman Dakait
  // Department: CSE
  // Section: CSE-B
  let currentBlock: Partial<ParsedStudent> = {};
  let linesSinceLastMatch = 0;

  for (const line of lines) {
    const isIdLine = /^(roll|id|usn|roll\s*no|roll\s*number):/i.test(line);
    const isNameLine = /^name:/i.test(line);
    const isDeptLine = /^(department|dept|branch|course):/i.test(line);
    const isSectionLine = /^(section|class\s*group|classgroup|class|group|sec):/i.test(line);

    if (isIdLine) {
      // If we already have a block with an ID, save it first
      if (currentBlock.id) {
        if (currentBlock.name && currentBlock.department && currentBlock.classGroup) {
          students.push({
            id: currentBlock.id,
            name: currentBlock.name,
            department: currentBlock.department,
            classGroup: currentBlock.classGroup,
          });
        }
        currentBlock = {};
      }
      const parts = line.split(':');
      currentBlock.id = parts.slice(1).join(':').trim().toUpperCase();
      linesSinceLastMatch = 0;
    } else if (isNameLine && currentBlock.id) {
      const parts = line.split(':');
      currentBlock.name = parts.slice(1).join(':').trim();
      linesSinceLastMatch = 0;
    } else if (isDeptLine && currentBlock.id) {
      const parts = line.split(':');
      currentBlock.department = parts.slice(1).join(':').trim();
      linesSinceLastMatch = 0;
    } else if (isSectionLine && currentBlock.id) {
      const parts = line.split(':');
      currentBlock.classGroup = parts.slice(1).join(':').trim();
      linesSinceLastMatch = 0;
    } else {
      linesSinceLastMatch++;
      // If we see more than 5 unrelated lines, reset current block
      if (linesSinceLastMatch > 5 && currentBlock.id) {
        if (currentBlock.name && currentBlock.department && currentBlock.classGroup) {
          students.push({
            id: currentBlock.id,
            name: currentBlock.name,
            department: currentBlock.department,
            classGroup: currentBlock.classGroup,
          });
        }
        currentBlock = {};
      }
    }
  }
  // Flush last block
  if (currentBlock.id && currentBlock.name && currentBlock.department && currentBlock.classGroup) {
    students.push({
      id: currentBlock.id,
      name: currentBlock.name,
      department: currentBlock.department,
      classGroup: currentBlock.classGroup,
    });
  }

  // If Strategy 1 succeeded in extracting students, return them
  if (students.length > 0) {
    return students;
  }

  // Strategy 2: Check for inline records or tab/comma/pipe delimited values
  // e.g. CS21B001, Rehman Dakait, CSE, CSE-B
  const rollRegexGlobal = /[A-Za-z]{2,4}\d{2}[A-Za-z]?\d{3,4}/i;

  for (const line of lines) {
    // Check if line contains a roll-number-like pattern
    const hasRoll = rollRegexGlobal.test(line);
    if (!hasRoll) continue;

    // Detect separator
    let separator = ',';
    if (line.includes('\t')) {
      separator = '\t';
    } else if (line.includes('|')) {
      separator = '|';
    } else if (line.includes(';') && !line.includes('&')) {
      separator = ';';
    } else if (line.includes('-') && line.split('-').length >= 3) {
      separator = '-';
    }

    const parts = line.split(separator).map(p => p.trim()).filter(p => p.length > 0);

    // We expect at least 3 parts (Roll, Name, Section / Department)
    if (parts.length >= 3) {
      let roll = '';
      let name = '';
      let department = '';
      let section = '';

      // Find roll
      const rollIndex = parts.findIndex(p => rollRegexGlobal.test(p));
      if (rollIndex !== -1) {
        roll = parts[rollIndex].toUpperCase();
        // Remove it from the search list
        parts.splice(rollIndex, 1);
      }

      if (!roll) continue;

      // Identify class group / section (usually matches something like CSE-B or a short word)
      const sectionIndex = parts.findIndex(p =>
        /^[A-Za-z]{2,5}-[A-Za-z\d]$/.test(p) ||
        /^(section|sec)\s*[A-Z\d]$/i.test(p) ||
        p.length <= 6
      );
      if (sectionIndex !== -1) {
        section = cleanValue(parts[sectionIndex]);
        parts.splice(sectionIndex, 1);
      }

      // Now identify Department and Name from remaining parts
      if (parts.length === 1) {
        // If only 1 part is left, it's likely the Name, and department is empty or inferred
        name = cleanValue(parts[0]);
      } else if (parts.length >= 2) {
        // The longer string is usually the department, the shorter is the name
        // (Or if one contains keywords like Engineering, Science, CSE, ECE, ME, Civil)
        const deptKeywords = /computer|science|engineering|technology|information|electrical|electronics|mechanical|civil|it|cse|ece|me/i;
        const firstIsDept = deptKeywords.test(parts[0]);
        const secondIsDept = deptKeywords.test(parts[1]);

        if (firstIsDept && !secondIsDept) {
          department = cleanValue(parts[0]);
          name = cleanValue(parts[1]);
        } else if (secondIsDept && !firstIsDept) {
          department = cleanValue(parts[1]);
          name = cleanValue(parts[0]);
        } else {
          // Compare lengths
          if (parts[0].length > parts[1].length) {
            department = cleanValue(parts[0]);
            name = cleanValue(parts[1]);
          } else {
            department = cleanValue(parts[1]);
            name = cleanValue(parts[0]);
          }
        }
      }

      // Add student
      students.push({
        id: roll,
        name: name || 'Unknown Name',
        department: department || 'Computer Science & Engineering', // fallback default
        classGroup: section || 'CSE-B', // fallback default
      });
    }
  }

  return students;
};