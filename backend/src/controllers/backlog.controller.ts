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
  name.trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeSubjectCode = (value: unknown): string => {
  const text = String(value || '').trim().toUpperCase();
  const codeMatch = text.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}\b/);
  return (codeMatch?.[0] || text.replace(/[^A-Z0-9]/g, '')).trim();
};

const extractExplicitSubjectCode = (value: unknown): string => {
  const match = String(value || '').toUpperCase().match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}\b/);
  return match?.[0] || '';
};

/**
 * Determine grade from internal, external, and total marks based on passing criteria
 * Returns 'P' for pass, 'F' for fail, or undefined if insufficient data
 *
 * Passing criteria (all must be true for PASS):
 *   internal >= 20
 *   external >= 18
 *   total >= 40
 */
const determineGradeFromMarks = (subject: any): 'P' | 'F' | undefined => {
  // If we already have an explicit grade, use it
  if (subject.grade === 'P' || subject.grade === 'F') {
    return subject.grade;
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
            status: 'not_found',
            message: 'Both student USN and name are required for verification'
          });
          continue;
        }
        const student = await prisma.user.findFirst({
          where: { id: usn, role: 'student' }
        });

        if (!student || normalizeStudentName(student.name) !== normalizeStudentName(name)) {
          // Skip if student not found
          processedStudents.push({
            ...studentData,
            status: 'not_found',
            message: student ? 'USN found but submitted name does not match' : 'Student USN not found in system'
          });
          continue;
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

        // Backlog status is determined only by the grade: F is a backlog and P is not.
        // Determine grade from explicit P/F or from marks if explicit grade not present
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
            (subject.grade === 'F' || subject.grade === 'P')
          );
        const businessLogicWithoutCode = studentData.subjects
          .filter((subject: any) => isBusinessLogicSubject(subject.subjectName) && !extractExplicitSubjectCode(subject.subjectCode));
        if (businessLogicWithoutCode.length > 0) {
          const businessLogicSubjects = await prisma.subject.findMany({
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
          (subject: { code: string; grade: string }) => subject.code && (subject.grade === 'F' || subject.grade === 'P')
        );
        const updatedBacklogSubjects = Array.from(new Set(currentBacklogSubjects.map(normalizeSubjectCode).filter(Boolean)));

        for (const subject of resolvedUploadedSubjects) {
          if (subject.grade === 'F' && !updatedBacklogSubjects.includes(subject.code)) {
            updatedBacklogSubjects.push(subject.code);
          } else if (subject.grade === 'P') {
            const index = updatedBacklogSubjects.indexOf(subject.code);
            if (index >= 0) updatedBacklogSubjects.splice(index, 1);
          }
        }

        const finalBacklogCount = updatedBacklogSubjects.length;

        // Update student backlog count and subjects
        const updatedStudent = await prisma.user.update({
          where: { id: student.id },
          data: {
            numberOfBacklogs: finalBacklogCount,
            backlogSubjects: updatedBacklogSubjects
          }
        });

        processedStudents.push({
          ...studentData,
          status: 'processed',
          backlogCount: finalBacklogCount,
          backlogSubjects: updatedBacklogSubjects
        });

        updatedStudents.push({
          id: updatedStudent.id,
          name: updatedStudent.name,
          usn: updatedStudent.id,
          backlogCount: updatedStudent.numberOfBacklogs,
          backlogSubjects: updatedStudent.backlogSubjects
        });
      } catch (studentError) {
        console.error(`Error processing student ${studentData.name}:`, studentError);
        processedStudents.push({
          ...studentData,
          status: 'error',
          message: 'Failed to process student record'
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
        name: true,
        department: true,
        program: true,
        semesterId: true,
        numberOfBacklogs: true,
        backlogSubjects: true
      }
    });

    // Format the response
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      usn: student.id, // Assuming USN is stored as id
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
  // This is a simplified parser - in a real implementation, you'd need
  // more sophisticated parsing based on the actual gradecard format
  const lines = text.split('\n');
  const students: any[] = [];

  // Look for patterns in the text to identify student records
  // This would need to be customized based on the actual gradecard format
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

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const identityMatch = trimmedLine.match(/^(Name|USN|Roll No):\s*(.*)$/i);
    if (identityMatch) {
      const field = identityMatch[1].toLowerCase();
      const value = identityMatch[2].trim();
      const startsNewStudent =
        field === 'name'
          ? currentStudent !== null && (currentStudent.name || currentSubjects.length > 0)
          : currentStudent !== null && currentStudent.usn && currentSubjects.length > 0;

      if (startsNewStudent) {
        saveCurrentStudent();
      }

      if (!currentStudent) {
        currentStudent = {
          name: '',
          usn: '',
          semester: '',
          subjects: []
        };
      }

      if (field === 'name') {
        currentStudent.name = value;
      } else {
        currentStudent.usn = value;
      }
    } else if (trimmedLine.match(/^(Subject|Course)/i)) {
      // Subject line - extract subject name and initialize subject object
      const subjectMatch = trimmedLine.match(/^(Subject|Course):?\s*(.+)$/i);
      if (subjectMatch) {
        const subjectName = subjectMatch[2].trim();
        if (subjectName) {
          const codeMatch = subjectName.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}\b/i);
          const subject: any = {
            subjectName: subjectName,
            subjectCode: codeMatch?.[0].toUpperCase() || subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10),
            credits: 4 // Default credits
          };
          currentSubjects.push(subject);
        }
      }
    } else if (currentStudent && currentSubjects.length > 0) {
      // We're inside a student block and have at least one subject - try to parse mark data
      const subject = currentSubjects[currentSubjects.length - 1]; // Get the last (current) subject

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
      const gradeMatch = trimmedLine.match(/Grade:?\s*([FP])/i);
      if (gradeMatch) {
        subject.grade = gradeMatch[1].toUpperCase();
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
                if (grade === 'F' || grade === 'P') {
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
        const codeMatch = subjectName.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}\b/i);
        const subject: any = {
          subjectName: subjectName,
          subjectCode: codeMatch?.[0].toUpperCase() || subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10),
          credits: 4 // Default credits
        };

        // Add mark data if available
        if (marks.internal !== undefined) subject.internalMarks = marks.internal;
        if (marks.external !== undefined) subject.externalMarks = marks.external;
        if (marks.total !== undefined) subject.totalMarks = marks.total;
        if (marks.grade === 'F' || marks.grade === 'P') subject.grade = marks.grade;

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
        if (grade === 'F' || grade === 'P') subjectMarks[subjectName].grade = grade;
      } else {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) continue;
        if (field.startsWith('internal') || field === 'int') subjectMarks[subjectName].internal = numericValue;
        else if (field.startsWith('external') || field === 'ext') subjectMarks[subjectName].external = numericValue;
        else subjectMarks[subjectName].total = numericValue;
      }
    }

    for (const [subjectName, marks] of Object.entries(subjectMarks)) {
      const codeMatch = subjectName.match(/\b[A-Z]{2,}[A-Z0-9]*\d{3,}\b/i);
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