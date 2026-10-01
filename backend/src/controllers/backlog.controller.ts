import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Document parsing imports
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

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

/**
 * Upload and parse gradecard document (PDF/Excel/Word)
 * Extracts student grades and identifies F grades
 */
export const uploadGradecard = async (req: AuthRequest, res: Response) => {
  try {
    // Run multer middleware
    upload.single('file')(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // Check if file was uploaded
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const { semesterId } = req.body;

        // Validate semesterId
        if (!semesterId) {
          // Clean up uploaded file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ error: 'Semester ID is required' });
        }

        // Parse the document based on file type
        let gradecardData: any = null;

        if (file.mimetype === 'application/pdf') {
          // Parse PDF
          const dataBuffer = fs.readFileSync(file.path);
          const pdfData = await pdfParse(dataBuffer);
          gradecardData = parsePDFText(pdfData.text);
        } else if (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel'
        ) {
          // Parse Excel
          const workbook = xlsx.readFile(file.path, { cellDates: true });
          gradecardData = parseExcelSheet(workbook);
        } else if (
          file.mimetype === 'application/msword' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          // Parse Word document
          const result = await mammoth.extractRawText({ path: file.path });
          gradecardData = parseWordText(result.value);
        }

        if (!gradecardData) {
          // Clean up uploaded file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ error: 'Unable to parse document. Please check the file format.' });
        }

        // Add metadata
        gradecardData.semesterId = semesterId;
        gradecardData.uploadedAt = new Date().toISOString();
        gradecardData.uploadedBy = req.user?.id;

        // Clean up uploaded file after parsing
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return res.status(200).json(gradecardData);
      } catch (parseError) {
        console.error('Error parsing gradecard:', parseError);
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: 'Internal server error while parsing gradecard' });
      }
    });
  } catch (error) {
    console.error('Error uploading gradecard:', error);
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Internal server error while uploading gradecard' });
  }
};

/**
 * Process gradecard data and update student backlogs
 */
export const processGradecard = async (req: AuthRequest, res: Response) => {
  try {
    const { semesterId, gradecardData } = req.body;

    if (!semesterId || !gradecardData) {
      return res.status(400).json({ error: 'Semester ID and gradecard data are required' });
    }

    // Validate that the semester exists
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId }
    });

    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    // Process each student in the gradecard
    const processedStudents = [];
    const updatedStudents = [];

    for (const studentData of gradecardData.students) {
      try {
        // Find student by USN or name
        let student = await prisma.user.findFirst({
          where: {
            OR: [
              { id: studentData.usn }, // Assuming USN is stored as id
              { name: studentData.name }
            ],
            role: 'student'
          }
        });

        if (!student) {
          // Skip if student not found
          processedStudents.push({
            ...studentData,
            status: 'not_found',
            message: 'Student not found in system'
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
        const backlogSubjects = studentData.subjects
          .filter((subj: any) => String(subj.grade || '').trim().toUpperCase() === 'F')
          .map((subj: any) => subj.subjectCode);

        // Calculate differences for cross-checking
        const subjectsToAdd = backlogSubjects.filter(
          (subject: string) => !currentBacklogSubjects.includes(subject)
        );
        const subjectsToRemove = currentBacklogSubjects.filter(
          (subject: string) => !backlogSubjects.includes(subject)
        );

        // Calculate new backlog count
        const currentBacklogCount = student.numberOfBacklogs || 0;
        const newBacklogCount =
          currentBacklogCount + subjectsToAdd.length - subjectsToRemove.length;

        // Ensure backlog count doesn't go below zero
        const finalBacklogCount = Math.max(0, newBacklogCount);

        // Calculate new backlog subjects array
        const updatedBacklogSubjects = [
          ...currentBacklogSubjects.filter(
            (subject) => !subjectsToRemove.includes(subject)
          ),
          ...subjectsToAdd
        ];

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
          const subject: any = {
            subjectName: subjectName,
            subjectCode: subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10), // Simple code generation
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
 * Parse Excel sheet to extract student grade data
 */
function parseExcelSheet(workbook: xlsx.WorkBook): any {
  // Simplified Excel parser
  const students: any[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: ''
    });

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
        const subject: any = {
          subjectName: subjectName,
          subjectCode: subjectName.replace(/\s+/g, '').toUpperCase().substring(0, 10), // Simple code generation
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

/**
 * Parse Word text to extract student grade data
 */
function parseWordText(text: string): any {
  // Similar to PDF parsing - simplified for now
  return parsePDFText(text);
}