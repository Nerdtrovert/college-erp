import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';

// Document parsing imports
import mammoth from 'mammoth';
import { Workbook } from 'exceljs';
import { parseExcel, parsePDF, parseWord } from '../utils/fileParser';

// Configure multer for file upload
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
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Excel, and Word documents are allowed.'));
    }
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

const removeFiles = async (files: Express.Multer.File[]): Promise<void> => {
  await Promise.all(files.map(async file => {
    try {
      await fs.promises.unlink(file.path);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Unable to remove uploaded gradecard:', error);
      }
    }
  }));
};

const normalizeStudentName = (name: string): string =>
  // OCR can omit spaces within an otherwise exact name. Compare only the
  // whitespace-normalized form; every name character and every initial still
  // has to match exactly, and the stored database value is never changed.
  name.replace(/\s+/g, '').toLowerCase();

const normalizeSubjectCode = (value: unknown): string => {
  const text = String(value || '').trim().toUpperCase();
  const codeMatch = text.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z]*\b/);
  return (codeMatch?.[0] || text.replace(/[^A-Z0-9]/g, '')).trim();
};

const extractExplicitSubjectCode = (value: unknown): string => {
  const match = String(value || '').toUpperCase().match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z]*\b/);
  return match?.[0] || '';
};

/**
 * Determine grade from internal, external, and total marks based on passing criteria
 * Returns an explicit P/F/A status when present; otherwise derives P/F from
 * marks, or returns undefined if there is insufficient mark data.
 *
 * Passing criteria (all must be true for PASS):
 *   internal >= 20
 *   external >= 18
 *   total >= 40
 */
const determineGradeFromMarks = (subject: any): 'P' | 'F' | 'A' | undefined => {
  // The issued grade-card result is authoritative. In particular, some valid
  // subjects have no external examination and therefore an external mark of 0.
  const explicitGrade = String(subject.grade || '').trim().toUpperCase();
  if (explicitGrade === 'P' || explicitGrade === 'F' || explicitGrade === 'A') {
    return explicitGrade;
  }

  // Check if we have all three mark components
  const internal = subject.internalMarks;
  const external = subject.externalMarks;
  const total = subject.totalMarks;

  // If any mark component is missing, we cannot determine grade from marks
  if (internal === undefined || external === undefined || total === undefined) {
    return undefined;
  }

  // Apply passing criteria: ALL conditions must be true for PASS
  const internalPass = internal >= 20;
  const externalPass = external >= 18;
  const totalPass = total >= 40;

  return (internalPass && externalPass && totalPass) ? 'P' : 'F';
};

const isBusinessLogicSubject = (value: unknown): boolean =>
  /\bbusiness\s+logic\b/i.test(String(value || ''));

/**
 * Upload and parse gradecard document (PDF/Excel/Word)
 * Extracts student grades and identifies F grades
 */
export const uploadGradecard = async (req: AuthRequest, res: Response) => {
  try {
    // Run multer middleware
    upload.fields([{ name: 'files', maxCount: 25 }, { name: 'file', maxCount: 1 }])(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const uploadedFields = (req.files as Record<string, Express.Multer.File[]> | undefined) || {};
        const files = [...(uploadedFields.files || []), ...(uploadedFields.file || [])];
        if (files.length === 0) {
          return res.status(400).json({ error: 'No gradecard files uploaded' });
        }

        const studentsByIdentity = new Map<string, any>();
        for (const file of files) {
          let parsedData: any;

          if (file.mimetype === 'application/pdf') {
            const dataBuffer = await fs.promises.readFile(file.path);
            const pdfText = await parsePDF(dataBuffer);
            parsedData = parsePDFText(pdfText);
          } else if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel'
          ) {
            const dataBuffer = await fs.promises.readFile(file.path);
            if (file.mimetype === 'application/vnd.ms-excel') {
              parsedData = parseExcelRows(await parseExcel(dataBuffer));
            } else {
              const workbook = new Workbook();
              await workbook.xlsx.readFile(file.path);
              parsedData = parseExcelSheet(workbook);
            }
          } else if (
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            const dataBuffer = await fs.promises.readFile(file.path);
            const wordText = await parseWord(dataBuffer);
            parsedData = parseWordText(wordText);
          }

          for (const student of parsedData?.students || []) {
            const identity = String(student.usn || student.name || '').trim().toUpperCase();
            if (!identity) continue;
            const existing = studentsByIdentity.get(identity);
            studentsByIdentity.set(identity, {
              ...existing,
              ...student,
              subjects: [...(existing?.subjects || []), ...(student.subjects || [])],
            });
          }
        }

        const gradecardData: any = { students: Array.from(studentsByIdentity.values()) };
        if (gradecardData.students.length === 0) {
          await removeFiles(files);
          return res.status(400).json({
            error: 'No readable student grade records were found. The file must contain selectable text or spreadsheet data with USN/name and subject grades; image-only PDFs require OCR before upload.'
          });
        }

        gradecardData.uploadedAt = new Date().toISOString();
        gradecardData.uploadedBy = req.user?.id;

        await removeFiles(files);

        return res.status(200).json(gradecardData);
      } catch (parseError) {
        console.error('Error parsing gradecard:', parseError);
        // Clean up uploaded file if it exists
        const uploadedFields = (req.files as Record<string, Express.Multer.File[]> | undefined) || {};
        const files = [...(uploadedFields.files || []), ...(uploadedFields.file || [])];
        await removeFiles(files);
        const message = parseError instanceof Error ? parseError.message : 'Unable to parse gradecard';
        return res.status(400).json({ error: `Unable to parse gradecard: ${message}` });
      }
    });
  } catch (error) {
    console.error('Error uploading gradecard:', error);
    // Clean up uploaded file if it exists
    const uploadedFields = (req.files as Record<string, Express.Multer.File[]> | undefined) || {};
    const files = [...(uploadedFields.files || []), ...(uploadedFields.file || [])];
    await removeFiles(files);
    return res.status(500).json({ error: 'Internal server error while uploading gradecard' });
  }
};

/**
 * Process gradecard data and update student backlogs
 */
export const processGradecard = async (req: AuthRequest, res: Response) => {
  try {
    const { gradecardData } = req.body;

    if (!gradecardData || !Array.isArray(gradecardData.students)) {
      return res.status(400).json({ error: 'Gradecard data is required' });
    }

    // Process each student in the gradecard
    const processedStudents = [];
    const updatedStudents = [];

    for (const studentData of gradecardData.students) {
      try {
        // USN is the unique identity; the name is an additional verification.
        const usn = String(studentData.usn || '').trim().toUpperCase();
        const name = String(studentData.name || '').trim();
        if (!usn || !name) {
          processedStudents.push({
            ...studentData,
            status: 'validation_failed',
            message: 'Both student USN and name are required for verification'
          });
          continue;
        }

        const txResult = await prisma.$transaction(async (tx) => {
          const student = await tx.user.findFirst({
            where: { email: usn.toLowerCase(), role: 'student' }
          });

          if (!student) {
            return { status: 'student_not_found', message: 'Student USN not found in system' };
          }
          
          if (normalizeStudentName(student.name) !== normalizeStudentName(name)) {
            return { status: 'name_mismatch', message: 'USN found but submitted name does not match' };
          }

          // Get current backlog subjects from database
          let currentBacklogSubjects: string[] = [];
          if (student.backlogSubjects) {
            if (Array.isArray(student.backlogSubjects)) {
              currentBacklogSubjects = student.backlogSubjects.map((subject: unknown) => String(subject).trim()).filter(Boolean);
            } else {
              currentBacklogSubjects = String(student.backlogSubjects)
                .split(',')
                .map((subject: string) => subject.trim())
                .filter(Boolean);
            }
          }

          // An explicit P/F/A is authoritative; marks are used only when absent.
          const uploadedSubjects = studentData.subjects
            .map((subject: any) => {
              const explicitCode = extractExplicitSubjectCode(subject.subjectCode);
              const subjectName = String(subject.subjectName || '').trim();
              const code = isBusinessLogicSubject(subjectName)
                ? explicitCode
                : (explicitCode || normalizeSubjectCode(subject.subjectCode || subjectName));

              // Determine grade: use explicit grade if present, otherwise calculate from marks
              const calculatedGrade = determineGradeFromMarks(subject);
              const grade = calculatedGrade !== undefined ? calculatedGrade : String(subject.grade || '').trim().toUpperCase();

              return {
                code,
                name: subjectName,
                grade
              };
            })
            .filter((subject: { code: string; name: string; grade: string }) =>
              (subject.code || isBusinessLogicSubject(subject.name)) &&
              (subject.grade === 'F' || subject.grade === 'P' || subject.grade === 'A')
            );

          const businessLogicWithoutCode = studentData.subjects
            .filter((subject: any) => isBusinessLogicSubject(subject.subjectName) && !extractExplicitSubjectCode(subject.subjectName));
            
          if (businessLogicWithoutCode.length > 0) {
            const businessLogicSubjects = await tx.subject.findMany({
              where: { name: { contains: 'Business Logic', mode: 'insensitive' } },
              select: { code: true }
            });
            if (businessLogicSubjects.length === 1) {
              const businessLogicCode = businessLogicSubjects[0].code;
              for (const subject of uploadedSubjects) {
                if (!subject.code && isBusinessLogicSubject(subject.name)) {
                  subject.code = businessLogicCode;
                }
              }
            }
          }

          const resolvedUploadedSubjects = uploadedSubjects.filter(
            (subject: { code: string; grade: string }) =>
              subject.code && (subject.grade === 'F' || subject.grade === 'P' || subject.grade === 'A')
          );

          if (resolvedUploadedSubjects.length === 0 && studentData.subjects.length > 0) {
            return { status: 'no_backlog_records', message: 'No valid P/F/A subjects found for calculation' };
          }

          const updatedBacklogSubjects = Array.from(new Set(currentBacklogSubjects.map(normalizeSubjectCode).filter(Boolean)));

          for (const subject of resolvedUploadedSubjects) {
            if ((subject.grade === 'F' || subject.grade === 'A') && !updatedBacklogSubjects.includes(subject.code)) {
              updatedBacklogSubjects.push(subject.code);
            } else if (subject.grade === 'P') {
              const index = updatedBacklogSubjects.indexOf(subject.code);
              if (index >= 0) updatedBacklogSubjects.splice(index, 1);
            }
          }

          const finalBacklogCount = updatedBacklogSubjects.length;

          // Update student backlog count and subjects
          const updatedStudent = await tx.user.update({
            where: { id: student.id },
            data: {
              numberOfBacklogs: finalBacklogCount,
              backlogSubjects: updatedBacklogSubjects
            }
          });

          return { status: 'update_succeeded', updatedStudent, finalBacklogCount, updatedBacklogSubjects };
        });

        if (txResult.status === 'update_succeeded') {
          processedStudents.push({
            ...studentData,
            status: 'processed',
            backlogCount: txResult.finalBacklogCount!,
            backlogSubjects: txResult.updatedBacklogSubjects!
          });

          updatedStudents.push({
            id: txResult.updatedStudent!.id,
            name: txResult.updatedStudent!.name,
            usn: txResult.updatedStudent!.email?.toUpperCase() || txResult.updatedStudent!.id,
            backlogCount: txResult.updatedStudent!.numberOfBacklogs,
            backlogSubjects: txResult.updatedStudent!.backlogSubjects
          });
        } else {
          processedStudents.push({
            ...studentData,
            status: txResult.status,
            message: txResult.message
          });
        }

      } catch (studentError: any) {
        console.error(`Error processing student ${studentData.name}:`, studentError);
        processedStudents.push({
          ...studentData,
          status: 'database_update_failed',
          message: studentError.message || 'Failed to process student record'
        });
      }
    }

    return res.status(200).json({
      processedStudents,
      updatedCount: updatedStudents.length,
      message: `Processed ${processedStudents.length} students, updated backlogs for ${updatedStudents.length} students`
    });
  } catch (error) {
    console.error('Error processing gradecard:', error);
    return res.status(500).json({ error: 'Internal server error while processing gradecard' });
  }
};

/**
 * Get all students with their backlog information
 * If semesterId is provided, filters by that semester
 * If semesterId is not provided, returns all students
 */
export const getStudentsWithBacklogs = async (req: AuthRequest, res: Response) => {
  try {
    const { semesterId, program } = req.query;

    // Build where clause
    const whereClause: any = {
      role: 'student'
    };

    // Only add semesterId filter if provided
    if (semesterId) {
      whereClause.semesterId = semesterId as string;
    }
    if (program && typeof program === 'string') {
      whereClause.program = program;
    }

    // Get all students (filtered by semester if specified)
    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        department: true,
        program: true,
        semesterId: true,
        numberOfBacklogs: true,
        backlogSubjects: true
      }
    });

    // Format the response. USN is stored in the email field (id is a UUID).
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      usn: student.email?.toUpperCase() || student.id,
      program: student.program || 'CSE',
      semester: student.semesterId || 'N/A',
      backlogCount: student.numberOfBacklogs,
      backlogSubjects: student.backlogSubjects
    }));

    return res.status(200).json(formattedStudents);
  } catch (error) {
    console.error('Error fetching students with backlogs:', error);
    return res.status(500).json({ error: 'Internal server error while fetching student backlogs' });
  }
};

/**
 * Parse PDF text to extract student grade data
 */
function parsePDFText(text: string): any {
  const rawLines = text.split('\n');

  // Pre-processing: reconstruct subject codes whose alphabetic suffix was
  // split onto a separate line by the PDF renderer.  For example, the VTU
  // result PDF may render "BESCK204C" as two lines: "BESCK204" and "C".
  // We merge a short (1-2 uppercase letter) line back into the preceding
  // line when that line starts with a subject-code-like token ending in
  // digits.  This is safe because real subject-name continuation lines are
  // typically much longer than 2 characters.
  const lines: string[] = [];
  for (let j = 0; j < rawLines.length; j++) {
    const cur = rawLines[j];
    const curTrimmed = cur.trim();
    if (
      curTrimmed.length >= 1 &&
      curTrimmed.length <= 2 &&
      /^[A-Z]{1,2}$/.test(curTrimmed) &&
      lines.length > 0
    ) {
      const prevTrimmed = lines[lines.length - 1].trim();
      // Check if the previous line is exclusively a subject code token that
      // ends in a digit — i.e. the suffix was split off.  We require no
      // additional text after the code to avoid merging into a complete
      // subject row that happens to end with digits.
      if (/^[A-Z]+[A-Z0-9]*\d+\s*$/.test(prevTrimmed)) {
        // Append the suffix directly to the previous line (no space — it is
        // part of the same token).
        lines[lines.length - 1] = lines[lines.length - 1].replace(/(\S)\s*$/, '$1' + curTrimmed);
        continue;
      }
    }
    lines.push(cur);
  }
  const students: any[] = [];
  let currentStudent: any = null;
  let currentSubjects: any[] = [];

  const saveCurrentStudent = () => {
    if (currentStudent && currentSubjects.length > 0) {
      students.push({
        ...currentStudent,
        subjects: currentSubjects
      });
    }
    currentStudent = null;
    currentSubjects = [];
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match various possible labels for name and ID fields using two patterns:
    // 1. Label : Value (with optional whitespace around colon)
    // 2. Label Value (no colon, but value must start with alphanumeric)
    // Anchor to start of line and use word boundaries to avoid partial matches
    const labelPatterns = [
      '\\bStudent\\s+Name',
      '\\bCandidate\\s+Name',
      '\\bFull\\s+Name',
      '\\bUniversity\\s+Seat\\s+Number',
      '\\bIdentification\\s+Number',
      '\\bRoll\\s*Number',
      '\\bRoll\\s*No',
      '\\bCandidate\\s*Number',
      '\\bName',
      '\\bUSN',
      '\\bID'
    ];

    // Pattern 1: with colon - ^\s*(LABEL)\s*:\s*(.*)
    const pattern1 = new RegExp(`^\\s*(${labelPatterns.join('|')})\\s*:\\s*(.*)`, 'i');
    // Pattern 2: without colon but value starts with alphanumeric - ^\s*(LABEL)\s+([A-Za-z0-9].*)
    const pattern2 = new RegExp(`^\\s*(${labelPatterns.join('|')})\\s+([A-Za-z0-9].*)`, 'i');

    let match = trimmedLine.match(pattern1);
    let value = null;
    let labelMatched = null;

    if (match) {
      labelMatched = match[1];
      value = match[2];
    } else {
      match = trimmedLine.match(pattern2);
      if (match) {
        labelMatched = match[1];
        value = match[2];
      }
    }

    if (value !== null && labelMatched !== null) {
      // Determine if this is a name field or ID field based on the label
      const labelLower = labelMatched.toLowerCase().trim();
      const isNameField = labelLower.startsWith('name') ||
                         labelLower.includes('student name') ||
                         labelLower.includes('candidate name') ||
                         labelLower.includes('full name');
      const isIdField = !isNameField && (labelLower.startsWith('usn') ||
                                        labelLower.includes('roll number') ||
                                        labelLower.includes('roll no') ||
                                        labelLower.includes('candidate number') ||
                                        labelLower.startsWith('id') ||
                                        labelLower.includes('identification number') ||
                                        labelLower.includes('university seat number'));

      let startsNewStudent = false;
      if (isNameField) {
        startsNewStudent = currentStudent !== null && (currentStudent.name || currentSubjects.length > 0);
        if (!currentStudent) {
          currentStudent = {
            name: '',
            usn: '',
            semester: '',
            subjects: []
          };
        }
        if (startsNewStudent) {
          saveCurrentStudent();
        }
        currentStudent.name = value;
      } else if (isIdField) {
        startsNewStudent = currentStudent !== null && (currentStudent.usn || currentSubjects.length > 0);
        if (!currentStudent) {
          currentStudent = {
            name: '',
            usn: '',
            semester: '',
            subjects: []
          };
        }
        if (startsNewStudent) {
          saveCurrentStudent();
        }
        currentStudent.usn = value;
      }
    }
    // Parse subject table - look for subject code patterns and process accordingly
    else if (currentStudent) {
      // Check if this line starts with a subject code pattern
      const subjectCodePattern = /^[A-Z]+[A-Z0-9]*\d+[A-Z0-9]*(?:\s|$)/;
      const marksPattern = /^\d+/; // Lines that start with digits are marks lines

      if (subjectCodePattern.test(trimmedLine)) {
        // Found a subject code line - parse this subject
        let subjectCode = '';
        let subjectName = '';
        let internalMarks = null;
        let externalMarks = null;
        let totalMarks = null;
        let grade = null;

        // Extract subject code from the beginning of the line
        const codeMatch = trimmedLine.match(/^([A-Z]+[A-Z0-9]*\d+[A-Z0-9]*)/);
        if (codeMatch) {
          subjectCode = codeMatch[1];
          const restOfLine = trimmedLine.substring(codeMatch[0].length);

          // Check if the rest of the line contains marks data (look for patterns like number number number)
          const marksPatternRegex = /(\d+\s+\d+\s+\d+)/;
          const marksMatch = restOfLine.match(marksPatternRegex);

          if (marksMatch) {
            // This line contains both subject name and marks
            // Split the rest of line at the marks pattern
            const marksIndex = restOfLine.indexOf(marksMatch[0]);
            subjectName = restOfLine.substring(0, marksIndex).trim();

            // Parse the marks line to extract internal, external, total, grade
            const marksLine = marksMatch[0];
            const internalMatch = marksLine.match(/Internal(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
            const externalMatch = marksLine.match(/External(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
            const totalMatch = marksLine.match(/Total(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
            const gradeMatch = restOfLine.match(/\b(P|F|A)\b/i);

            // Also try to parse as space-separated numbers (alternative format)
            const numbersMatch = marksLine.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);

            const subject: any = {
              subjectName: subjectName,
              subjectCode: subjectCode,
              credits: 4 // Default credits
            };

            if (internalMatch) {
              const marks = parseFloat(internalMatch[1]);
              if (!isNaN(marks)) {
                subject.internalMarks = marks;
              }
            } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[1]))) {
              subject.internalMarks = parseFloat(numbersMatch[1]);
            }

            if (externalMatch) {
              const marks = parseFloat(externalMatch[1]);
              if (!isNaN(marks)) {
                subject.externalMarks = marks;
              }
            } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[2]))) {
              subject.externalMarks = parseFloat(numbersMatch[2]);
            }

            if (totalMatch) {
              const marks = parseFloat(totalMatch[1]);
              if (!isNaN(marks)) {
                subject.totalMarks = marks;
              }
            } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[3]))) {
              subject.totalMarks = parseFloat(numbersMatch[3]);
            }

            if (gradeMatch) {
              subject.grade = gradeMatch[1].toUpperCase();
            }

            currentSubjects.push(subject);
          } else {
            // A VTU row may carry an explicit result while its marks are NE/-.
            // Keep that row even though it has no numeric marks.
            const inlineResultMatch = restOfLine.match(/\b(P|F|A)\b(?:\s+\d{4}-\d{2}-\d{2}\b|\s*$)/i);
            if (inlineResultMatch) {
              const marksStart = restOfLine.search(/\b(?:NE|\d+(?:\s*\+\s*\d+)?)(?:\s*\([^)]*\))?\s+(?:NE|\d+|-)\s+(?:NE|\d+|-)\s+(?:P|F|A)\b/i);
              currentSubjects.push({
                subjectName: (marksStart >= 0 ? restOfLine.substring(0, marksStart) : restOfLine).trim(),
                subjectCode,
                credits: 4,
                grade: inlineResultMatch[1].toUpperCase()
              });
              continue;
            }

            // This line does NOT contain marks, so the name continues
            subjectCode = codeMatch[1];
            subjectName = restOfLine.trim();

            // Check if next line exists and is a name continuation line
            let nameContinued = false;
            while (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              if (!nextLine) {
                i++;
                continue;
              }
              // If next line doesn't start with subject code and doesn't look like marks, it's likely name continuation
              const nextLineIsSubjectCode = /^[A-Z]+[A-Z0-9]*\d+[A-Z0-9]*(?:\s|$)/.test(nextLine);
              const nextLineIsMarks = /^\d+/.test(nextLine) || /\b(P|F|A)\b/i.test(nextLine) || /^NE\b/i.test(nextLine);

              if (!nextLineIsSubjectCode && !nextLineIsMarks && nextLine.length > 0) {
                // This is a name continuation line
                subjectName += ' ' + nextLine;
                nameContinued = true;
                i++; // Skip the next line since we've consumed it
              } else {
                break;
              }
            }

            // Now look for the marks line (should be after the name continuation)
            let marksLineIndex = i + 1;
            // Removed redundant block since we properly incremented i in the loop


            // Skip empty lines to find the marks line
            while (marksLineIndex < lines.length && lines[marksLineIndex].trim() === '') {
              marksLineIndex++;
            }

            if (marksLineIndex < lines.length) {
              const marksLine = lines[marksLineIndex].trim();
              const explicitResultMatch = marksLine.match(/\b(P|F|A)\b/i);
              // A result row can start with NE rather than a numeric mark.
              if (/^\d+/.test(marksLine) || explicitResultMatch || /^NE\b/i.test(marksLine)) {
                // Parse the marks line to extract internal, external, total, grade
                const internalMatch = marksLine.match(/Internal(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
                const externalMatch = marksLine.match(/External(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
                const totalMatch = marksLine.match(/Total(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
                const gradeMatch = marksLine.match(/\b(P|F|A)\b/i);

                // Also try to parse as space-separated numbers (alternative format)
                const numbersMatch = marksLine.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);

                const subject: any = {
                  subjectName: subjectName,
                  subjectCode: subjectCode,
                  credits: 4 // Default credits
                };

                if (internalMatch) {
                  const marks = parseFloat(internalMatch[1]);
                  if (!isNaN(marks)) {
                    subject.internalMarks = marks;
                  }
                } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[1]))) {
                  subject.internalMarks = parseFloat(numbersMatch[1]);
                }

                if (externalMatch) {
                  const marks = parseFloat(externalMatch[1]);
                  if (!isNaN(marks)) {
                    subject.externalMarks = marks;
                  }
                } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[2]))) {
                  subject.externalMarks = parseFloat(numbersMatch[2]);
                }

                if (totalMatch) {
                  const marks = parseFloat(totalMatch[1]);
                  if (!isNaN(marks)) {
                    subject.totalMarks = marks;
                  }
                } else if (numbersMatch && !isNaN(parseFloat(numbersMatch[3]))) {
                  subject.totalMarks = parseFloat(numbersMatch[3]);
                }

                if (gradeMatch) {
                  subject.grade = gradeMatch[1].toUpperCase();
                }

                currentSubjects.push(subject);

                // Skip the marks line since we've processed it
                i = marksLineIndex;
              }
            }
          }
        }
      }
      // Also process marks lines that come after subject definitions (for 2-line subjects where we didn't catch the marks above)
      else if (marksPattern.test(trimmedLine) && currentSubjects.length > 0) {
        // This is a marks line that belongs to the most recently added subject
        const subject = currentSubjects[currentSubjects.length - 1];

        // Look for internal marks
        const internalMatch = trimmedLine.match(/Internal(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
        if (internalMatch) {
          const marks = parseFloat(internalMatch[1]);
          if (!isNaN(marks)) {
            subject.internalMarks = marks;
          }
        }

        // Look for external marks
        const externalMatch = trimmedLine.match(/External(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
        if (externalMatch) {
          const marks = parseFloat(externalMatch[1]);
          if (!isNaN(marks)) {
            subject.externalMarks = marks;
          }
        }

        // Look for total marks
        const totalMatch = trimmedLine.match(/Total(?:Marks?):?\s*(\d+(?:\.\d+)?)/i);
        if (totalMatch) {
          const marks = parseFloat(totalMatch[1]);
          if (!isNaN(marks)) {
            subject.totalMarks = marks;
          }
        }

        // Also look for direct grade mention
        const gradeMatch = trimmedLine.match(/\b(P|F|A)\b/i);
        if (gradeMatch) {
          subject.grade = gradeMatch[1].toUpperCase();
        }
      }
    }
  }

  saveCurrentStudent();

  if (students.length === 0) {
    return { students: [] };
  }

  return { students };
}

/**
 * Convert ExcelJS worksheet to 2D array of values (similar to xlsx utils but returning raw values)
 */
function worksheetTo2DArray(worksheet: any): any[][] {
  const data: any[][] = [];
  const columnCount = worksheet.columnCount || 0;

  worksheet.eachRow((row: any) => {
    const rowData = [];
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      rowData.push(row.getCell(columnNumber).value);
    }
    data.push(rowData);
  });

  return data;
}

/**
 * Parse Excel sheet to extract student grade data
 */
function parseExcelSheet(workbook: any): any {
  // Simplified Excel parser
  const students: any[] = [];

  workbook.worksheets.forEach((worksheet: any) => {
    const rows = worksheetTo2DArray(worksheet);

    // Assume first row contains headers
    if (rows.length < 2) return;

    const headers = rows[0].map((cell: any) =>
      cell ? String(cell).toLowerCase().trim() : ''
    );

    // Process each data row
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || row.length === 0) continue;

      // Create student object from row data
      const student: any = {
        name: '',
        usn: '',
        semester: '',
        subjects: []
      };

      // Temporary object to collect mark data by subject
      const subjectMarks: Record<string, Record<string, number | string>> = {};

      // Process each column
      headers.forEach((header: string, colIdx: number) => {
        const value = row[colIdx];
        if (value !== undefined && value !== null) {
          const strValue = String(value).trim();

          // Handle student identifying information
          if (header.includes('name')) {
            student.name = strValue;
          } else if (header.includes('usn') || header.includes('roll')) {
            student.usn = strValue;
          } else if (header.includes('semester')) {
            student.semester = strValue;
          }
          // Handle potential mark columns - look for patterns like "SubjectName_Internal", "SubjectName_External", etc.
          else {
            // Check if header matches pattern: something_Internal, something_External, something_Total
            const internalMatch = header.match(/^(.+?)_(internal|int|internalmarks?)$/i);
            const externalMatch = header.match(/^(.+?)_(external|ext|externalmarks?)$/i);
            const totalMatch = header.match(/^(.+?)_(total|tot|totalmarks?)$/i);
            const gradeMatch = header.match(/^(.+?)_(grade|result|status)$/i);

            const numericValue = Number(strValue);
            if (internalMatch || externalMatch || totalMatch || gradeMatch) {
              const subjectMatch = internalMatch || externalMatch || totalMatch || gradeMatch;
              const subjectName = subjectMatch![1].trim();
              if (!subjectMarks[subjectName]) subjectMarks[subjectName] = {};

              if (gradeMatch) {
                const grade = strValue.toUpperCase();
                if (grade === 'F' || grade === 'P' || grade === 'A') {
                  subjectMarks[subjectName].grade = grade;
                }
              } else if (!isNaN(numericValue)) {
                if (internalMatch) {
                  subjectMarks[subjectName].internal = numericValue;
                } else if (externalMatch) {
                  subjectMarks[subjectName].external = numericValue;
                } else if (totalMatch) {
                  subjectMarks[subjectName].total = numericValue;
                }
              }
            }
          }
        }
      });

      // Convert collected mark data to subject objects
      for (const [subjectName, marks] of Object.entries(subjectMarks)) {
        const codeMatch = subjectName.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z]*\b/i);
        const subject: any = {
          subjectName: subjectName,
          subjectCode: codeMatch?.[0].toUpperCase() || subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10),
          credits: 4 // Default credits
        };

        // Add mark data if available
        if (marks.internal !== undefined) subject.internalMarks = marks.internal;
        if (marks.external !== undefined) subject.externalMarks = marks.external;
        if (marks.total !== undefined) subject.totalMarks = marks.total;
        if (marks.grade === 'F' || marks.grade === 'P' || marks.grade === 'A') subject.grade = marks.grade;

        student.subjects.push(subject);
      }

      // Only add if we have at least a name or USN
      if (student.name || student.usn) {
        students.push(student);
      }
    }
  });

  if (students.length === 0) {
    return { students: [] };
  }

  return { students };
}

function parseExcelRows(rows: any[]): any {
  const students = rows.map(row => {
    const student: any = { name: '', usn: '', semester: '', subjects: [] };
    const subjectMarks: Record<string, Record<string, number | string>> = {};

    for (const [rawHeader, rawValue] of Object.entries(row)) {
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') continue;
      const header = String(rawHeader).toLowerCase().trim();
      const value = String(rawValue).trim();

      if (header.includes('name')) {
        student.name = value;
        continue;
      }
      if (header.includes('usn') || header.includes('roll') || header === 'id') {
        student.usn = value;
        continue;
      }
      if (header.includes('semester')) {
        student.semester = value;
        continue;
      }

      const match = header.match(/^(.+?)[_\s-](internal|int|internalmarks?|external|ext|externalmarks?|total|tot|totalmarks?|grade|result|status)$/i);
      if (!match) continue;
      const subjectName = match[1].trim();
      const field = match[2].toLowerCase();
      if (!subjectMarks[subjectName]) subjectMarks[subjectName] = {};

      if (['grade', 'result', 'status'].includes(field)) {
        const grade = value.toUpperCase();
        if (grade === 'F' || grade === 'P' || grade === 'A') subjectMarks[subjectName].grade = grade;
      } else {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) continue;
        if (field.startsWith('internal') || field === 'int') subjectMarks[subjectName].internal = numericValue;
        else if (field.startsWith('external') || field === 'ext') subjectMarks[subjectName].external = numericValue;
        else subjectMarks[subjectName].total = numericValue;
      }
    }

    for (const [subjectName, marks] of Object.entries(subjectMarks)) {
      const codeMatch = subjectName.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}[A-Z]*\b/i);
      student.subjects.push({
        subjectName,
        subjectCode: codeMatch?.[0].toUpperCase() || subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10),
        ...(marks.grade ? { grade: marks.grade } : {}),
        ...(marks.internal !== undefined ? { internalMarks: marks.internal } : {}),
        ...(marks.external !== undefined ? { externalMarks: marks.external } : {}),
        ...(marks.total !== undefined ? { totalMarks: marks.total } : {}),
      });
    }

    return student;
  }).filter(student => student.name || student.usn);

  return { students };
}

/**
 * Parse Word text to extract student grade data
 */
function parseWordText(text: string): any {
  // Similar to PDF parsing - simplified for now
  return parsePDFText(text);
}
