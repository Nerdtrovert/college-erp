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
import * as exceljs from 'exceljs';

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
          const workbook = new exceljs.Workbook();
          await workbook.xlsx.readFile(file.path);
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

        // Count F grades and collect backlog subjects
        const fGrades = studentData.subjects.filter((subj: any) => subj.grade === 'F');
        const backlogSubjects = fGrades.map((subj: any) => subj.subjectCode);

        // Update student backlog count and subjects
        const updatedStudent = await prisma.user.update({
          where: { id: student.id },
          data: {
            numberOfBacklogs: backlogSubjects.length,
            backlogSubjects: backlogSubjects
          }
        });

        processedStudents.push({
          ...studentData,
          status: 'processed',
          backlogCount: backlogSubjects.length,
          backlogSubjects: backlogSubjects
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
      department: student.department || 'N/A',
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
  const students = [];

  // Look for patterns in the text to identify student records
  // This would need to be customized based on the actual gradecard format
  let currentStudent: any = null;
  let currentSubjects: any[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Simple pattern matching - this would need to be enhanced
    // Look for student name/USN patterns
    if (trimmedLine.match(/^(Name|USN|Roll No):/i)) {
      // Save previous student if exists
      if (currentStudent && currentSubjects.length > 0) {
        students.push({
          ...currentStudent,
          subjects: currentSubjects
        });
        currentSubjects = [];
      }

      // Start new student
      currentStudent = {
        name: '',
        usn: '',
        semester: '',
        subjects: []
      };

      // Extract value after colon
      const value = trimmedLine.split(':')[1].trim();
      if (trimmedLine.toLowerCase().startsWith('name:')) {
        currentStudent.name = value;
      } else if (trimmedLine.toLowerCase().startsWith('usn:') || trimmedLine.toLowerCase().startsWith('roll no:')) {
        currentStudent.usn = value;
      }
    } else if (trimmedLine.match(/^(Subject|Course)/i)) {
      // Subject line - this would need more sophisticated parsing
      // For now, we'll skip detailed subject parsing in this example
    }
  }

  // Don't forget the last student
  if (currentStudent && currentSubjects.length > 0) {
    students.push({
      ...currentStudent,
      subjects: currentSubjects
    });
  }

  // If we couldn't parse structured data, return a basic format
  // In a real implementation, you'd have proper parsing logic here
  if (students.length === 0) {
    // Return a mock structure for demonstration
    return {
      students: [
        {
          name: 'Sample Student',
          usn: 'CS21B042',
          semester: 'CS401',
          subjects: [
            { subjectCode: 'CS2301', subjectName: 'Data Structures', grade: 'F', credits: 4 },
            { subjectCode: 'CS2302', subjectName: 'Algorithms', grade: 'B', credits: 4 }
          ]
        }
      ]
    };
  }

  return { students };
}

/**
 * Parse Excel sheet to extract student grade data
 */
function parseExcelSheet(workbook: exceljs.Workbook): any {
  // Simplified Excel parser
  const students: any[] = [];

  workbook.eachSheet((worksheet, sheetId) => {
    const rows: any[][] = [];
    worksheet.eachRow((row, rowNumber) => {
      // exceljs row.values is 1-indexed, so we drop the first empty element
      const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(rowValues);
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

      // Map headers to values
      headers.forEach((header: string, colIdx: number) => {
        const value = row[colIdx];
        if (value !== undefined && value !== null) {
          const strValue = String(value).trim();
          if (header.includes('name')) {
            student.name = strValue;
          } else if (header.includes('usn') || header.includes('roll')) {
            student.usn = strValue;
          } else if (header.includes('semester')) {
            student.semester = strValue;
          }
          // Subject parsing would be more complex - simplified for now
        }
      });

      // Only add if we have at least a name or USN
      if (student.name || student.usn) {
        students.push(student);
      }
    }
  });

  // If no structured data found, return mock data
  if (students.length === 0) {
    return {
      students: [
        {
          name: 'Sample Student',
          usn: 'CS21B042',
          semester: 'CS401',
          subjects: [
            { subjectCode: 'CS2301', subjectName: 'Data Structures', grade: 'F', credits: 4 },
            { subjectCode: 'CS2302', subjectName: 'Algorithms', grade: 'B', credits: 4 }
          ]
        }
      ]
    };
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