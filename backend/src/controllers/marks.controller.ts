import { Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { semesterService } from '../services/SemesterService';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { parseExcel, parseWord, parsePDF } from '../utils/fileParser';

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
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Excel, and Word documents are allowed for marks import.'));
    }
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const removeUploadedFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Unable to remove uploaded file:', error);
    }
  }
};

const hasExpectedFileSignature = (buffer: Buffer, ext: string): boolean => {
  if (ext === '.pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
  if (ext === '.xls') return buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'));
  if (ext === '.xlsx' || ext === '.docx') return buffer.subarray(0, 2).toString() === 'PK';
  if (ext === '.doc') return buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'));
  return false;
};

/**
 * Upload and parse marks document (PDF/Excel/Word)
 * Extracts marks data and identifies assignments/students
 */
export const uploadMarks = async (req: AuthRequest, res: Response) => {
  try {
    // Run multer middleware
    upload.single('file')(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
          return res.status(400).json({ error: 'No marks file uploaded' });
        }

        // Read the uploaded file
        const fileBuffer = await fs.promises.readFile(file.path);

        let parsedData: any;

        // Parse based on file type
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
          // Parse Excel file
          parsedData = await parseExcel(fileBuffer);
        } else if (ext === '.docx' || ext === '.doc') {
          // Parse Word file
          const text = await parseWord(fileBuffer);
          // For Word, we'll need to parse the text to extract marks data
          // This is a simplified implementation - in reality would need more sophisticated parsing
          parsedData = parseMarksFromText(text);
        } else if (ext === '.pdf') {
          // Parse PDF file
          const text = await parsePDF(fileBuffer);
          // For PDF, we'll need to parse the text to extract marks data
          parsedData = parseMarksFromText(text);
        } else {
          await removeUploadedFile(file.path);
          return res.status(400).json({ error: 'Unsupported file type. Please upload Excel (.xlsx/.xls), Word (.docx/.doc), or PDF (.pdf)' });
        }

        // Validate the parsed data structure
        if (!parsedData || !Array.isArray(parsedData.records) || parsedData.records.length === 0) {
          await removeUploadedFile(file.path);
          return res.status(400).json({ error: 'No valid marks records found in the uploaded file' });
        }

        // Clean up uploaded file
        await removeUploadedFile(file.path);

        // Return preview data
        return res.status(200).json({
          totalRecords: parsedData.records.length,
          preview: parsedData.records.slice(0, 10), // First 10 records for preview
          ...parsedData
        });

      } catch (parseError) {
        console.error('Error parsing marks file:', parseError);
        // Clean up uploaded file if it exists
        const file = req.file as Express.Multer.File | undefined;
        if (file) {
          await removeUploadedFile(file.path).catch(() => {}); // Ignore cleanup errors
        }
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        return res.status(400).json({ error: `Unable to parse marks file: ${errorMessage}` });
      }
    });
  } catch (error) {
    console.error('Error uploading marks:', error);
    return res.status(500).json({ error: 'Internal server error while uploading marks' });
  }
};

/**
 * Parse marks from text (simplified implementation)
 * In a production system, this would be more sophisticated
 */
function parseMarksFromText(text: string): any {
  // This is a simplified parser - in reality would need to handle the actual document layout
  // For now, we'll return a structure that indicates the format expected

  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Look for common patterns in marksheets
  // This would need to be customized based on the actual format of marksheets

  // For demonstration, we'll return a basic structure
  // In a real implementation, this would parse the actual marks data

  return {
    // These would be extracted from the document header
    semesterId: undefined, // Would need to be provided or extracted
    records: [] // Would be populated with actual marks data
  };
}

/**
 * Import validated marks entries transactionally
 */
export const importMarks = async (req: AuthRequest, res: Response) => {
  try {
    const { semesterId, records } = req.body;

    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId is required' });
    }

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'marks records array is required' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No marks records provided for import' });
    }

    // Verify semester exists
    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    // Process the import transactionally
    const result = await prisma.$transaction(async (tx) => {
      let importedCount = 0;
      let skippedCount = 0;
      const validationErrors: any[] = [];

      for (const record of records) {
        try {
          // Validate each record
          if (!record.studentId || !record.subjectCode || !record.type) {
            validationErrors.push({
              record,
              errors: ['Student ID, subject code, and mark type are required'],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Find the student
          const student = await tx.user.findUnique({
            where: { id: record.studentId, role: 'student' }
          });

          if (!student) {
            validationErrors.push({
              record,
              errors: [`Student not found: ${record.studentId}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Find the assignment (SubjectSectionAssignment) for this subject and the student's class group
          // We need to get the student's class group for this semester
          const enrollment = await tx.studentEnrollment.findFirst({
            where: {
              studentId: record.studentId,
              semesterId: semester.id
            }
          });

          if (!enrollment) {
            validationErrors.push({
              record,
              errors: [`Student enrollment not found for semester ${semester.id}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Find the assignment for this subject and class group
          const assignment = await tx.subjectSectionAssignment.findFirst({
            where: {
              subject: {
                code: record.subjectCode
              },
              classGroup: enrollment.classGroup
            }
          });

          if (!assignment) {
            validationErrors.push({
              record,
              errors: [`Assignment not found for subject ${record.subjectCode} in class group ${enrollment.classGroup}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Validate mark type
          const validTypes = ['cie1', 'cie2', 'cie3', 'assignment', 'lab'];
          if (!validTypes.includes(record.type)) {
            validationErrors.push({
              record,
              errors: [`Invalid mark type: ${record.type}. Must be one of: ${validTypes.join(', ')}`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Validate score
          const score = record.score;
          if (score !== null && score !== undefined) {
            if (typeof score !== 'number' || score < 0) {
              validationErrors.push({
                record,
                errors: [`Score must be a non-negative number or null`],
                warnings: []
              });
              skippedCount++;
              continue;
            }
          }

          // Validate maxScore
          const maxScore = record.maxScore;
          if (typeof maxScore !== 'number' || maxScore < 0) {
            validationErrors.push({
              record,
              errors: [`Max score must be a non-negative number`],
              warnings: []
            });
            skippedCount++;
            continue;
          }

          // Check if score exceeds maxScore (if both are provided)
          if (score !== null && score !== undefined && record.maxScore !== undefined) {
            if (score > record.maxScore) {
              validationErrors.push({
                record,
                warnings: [`Score (${score}) exceeds max score (${record.maxScore})`]
              });
              // We'll still process it but warn the user
            }
          }

          // Upsert the mark record
          await tx.mark.upsert({
            where: {
              studentId_assignmentId_type_semesterId: {
                studentId: record.studentId,
                assignmentId: assignment.id,
                type: record.type,
                semesterId: semester.id
              }
            },
            update: {
              score: record.score,
              maxScore: record.maxScore
            },
            create: {
              type: record.type,
              score: record.score,
              maxScore: record.maxScore,
              updatedAt: new Date(),
              student: {
                connect: { id: record.studentId }
              },
              assignment: {
                connect: { id: assignment.id }
              },
              semester: {
                connect: { id: semester.id }
              }
            }
          });

          importedCount++;
        } catch (recordError: any) {
          console.error('Error processing marks record:', recordError);
          validationErrors.push({
            record,
            errors: [`Failed to process record: ${recordError.message}`],
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
    console.error('Error importing marks:', error);
    return res.status(500).json({ error: 'Internal server error while importing marks' });
  }
};

export const getStudentMarks = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  const classGroup = req.user?.classGroup;

  if (!studentId || !classGroup) {
    return res.status(400).json({ error: 'Invalid credentials or missing class section group context' });
  }

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find all assignments for this student's class group in the active semester
    const assignments = await prisma.subjectSectionAssignment.findMany({
      where: { classGroup },
      include: {
        subject: { select: { code: true, name: true, type: true } },
        theoryFaculty: { select: { name: true } },
        labFaculty: { select: { name: true } },
        marks: {
          where: {
            studentId,
            semesterId: activeSem.id,
          },
        },
      },
    });

    // Map into the format expected by StudentMarks.tsx
    const marksData = assignments.map((assign) => {
      // Helper to calculate best 2 average of CIEs and scale
      const getCieScore = () => {
        const c1 = assign.marks.find((m) => m.type === 'cie1')?.score;
        const c2 = assign.marks.find((m) => m.type === 'cie2')?.score;
        const c3 = assign.marks.find((m) => m.type === 'cie3')?.score;

        const scores = [c1, c2, c3].filter((s): s is number => s !== undefined && s !== null);
        if (scores.length === 0) return null;

        // Best 2 average
        scores.sort((a, b) => b - a);
        const best = scores.slice(0, 2);
        const avg = best.reduce((sum, val) => sum + val, 0) / best.length;

        // Scale based on subject type (Standalone to 25, Integrated to 15)
        const scaleFactor = assign.subject.type === 'STANDALONE' ? 0.5 : 0.3;
        const scaled = avg * scaleFactor;
        return Math.round(scaled * 10) / 10;
      };

      // Helper to calculate assignment score
      const getAssignmentScore = () => {
        if (assign.subject.type === 'STANDALONE') {
          const a = assign.marks.find((m) => m.type === 'assignment')?.score;
          return a !== undefined ? a : null;
        } else {
          // Integrated: average of assignment1 and assignment2
          const a1 = assign.marks.find((m) => m.type === 'assignment1')?.score;
          const a2 = assign.marks.find((m) => m.type === 'assignment2')?.score;

          const scores = [a1, a2].filter((s): s is number => s !== undefined && s !== null);
          if (scores.length === 0) return null;
          const avg = scores.reduce((sum, val) => sum + val, 0) / scores.length;
          return Math.round(avg * 10) / 10;
        }
      };

      const getLabScore = () => {
        if (assign.subject.type === 'STANDALONE') return null;
        const l = assign.marks.find((m) => m.type === 'lab')?.score;
        return l !== undefined ? l : null;
      };

      const cieScore = getCieScore();
      const assignmentScore = getAssignmentScore();
      const labScore = getLabScore();

      const isStandalone = assign.subject.type === 'STANDALONE';

      // Determine faculty name: prefer theory faculty, fallback to lab faculty
      const facultyName = assign.theoryFaculty?.name ?? assign.labFaculty?.name ?? '';

      return {
        name: assign.subject.name,
        code: assign.subject.code,
        faculty: facultyName,
        type: assign.subject.type,
        assessments: [
          { name: 'CIE', marks: cieScore, max: isStandalone ? 25 : 15 },
          { name: 'Assignment', marks: assignmentScore, max: isStandalone ? 25 : 10 },
          { name: 'Lab', marks: labScore, max: isStandalone ? 0 : 25 }
        ],
      };
    });

    return res.status(200).json(marksData);
  } catch (error) {
    console.error('Error fetching student marks:', error);
    return res.status(500).json({ error: 'Internal server error during marks list retrieval' });
  }
};

export const getTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, assessmentType } = req.params as { subjectCode: string; assessmentType: string };
  const teacherId = req.user?.id;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found' });
  }

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find the assignment for this subject and teacher in the active semester to get classGroup
    const assignmentForSlot = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        OR: [
          { theoryFacultyId: teacherId },
          { labFacultyId: teacherId }
        ]
      },
      include: {
        subject: { select: { code: true, name: true, type: true } }
      }
    });

    if (!assignmentForSlot) {
      return res.status(404).json({ error: 'Subject section assignment not found for this teacher and subject' });
    }

    // Find the timetable slot for this assignment in the active semester to get classGroup
    const slot = await prisma.timetableSlot.findFirst({
      where: {
        assignmentId: assignmentForSlot.id,
        semesterId: activeSem.id,
      },
      select: { classGroup: true }
    });

    if (!slot) {
      return res.status(404).json({ error: 'No timetable slot found for this subject and semester' });
    }
    const classGroup = slot.classGroup;

    // Get the assignment (SubjectSectionAssignment) for this subject and classGroup
    const targetAssignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        classGroup
      },
      include: {
        subject: { select: { code: true, name: true, type: true } },
        theoryFaculty: { select: { name: true } },
        labFaculty: { select: { name: true } }
      }
    });

    if (!targetAssignment) {
      return res.status(404).json({ error: 'Subject section assignment not found' });
    }

    // Get all students inside this class group section
    const students = await prisma.user.findMany({
      where: { role: 'student', classGroup },
      orderBy: { id: 'asc' },
    });

    // Get marks records matching the assignment, type, student, and active semester
    const marks = await prisma.mark.findMany({
      where: {
        assignmentId: targetAssignment.id,
        type: assessmentType,
        semesterId: activeSem.id,
      },
    });

    const marksMap = Object.fromEntries(marks.map((m) => [m.studentId, m.score]));

    const studentMarksList = students.map((stud) => ({
      roll: stud.id,
      name: stud.name,
      score: marksMap[stud.id] !== undefined ? marksMap[stud.id] : null,
    }));

    // Determine faculty name for the response (prefer theory faculty)
    const facultyName = targetAssignment.theoryFaculty?.name ?? targetAssignment.labFaculty?.name ?? '';

    return res.status(200).json({
      subjectCode: targetAssignment.subject.code,
      classGroup,
      assessmentType,
      faculty: facultyName,
      students: studentMarksList,
    });
  } catch (error) {
    console.error('Error fetching teacher marks registry view:', error);
    return res.status(500).json({ error: 'Internal server error during marks repository fetch' });
  }
};

export const exportTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, assessmentType } = req.params as { subjectCode: string; assessmentType: string };
  const teacherId = req.user?.id;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found' });
  }

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find the assignment for this subject and teacher in the active semester to get classGroup
    const assignmentForSlot = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        OR: [
          { theoryFacultyId: teacherId },
          { labFacultyId: teacherId }
        ]
      },
      include: {
        subject: { select: { code: true, name: true, type: true } }
      }
    });

    if (!assignmentForSlot) {
      return res.status(404).json({ error: 'Subject section assignment not found for this teacher and subject' });
    }

    // Find the timetable slot for this assignment in the active semester to get classGroup
    const slot = await prisma.timetableSlot.findFirst({
      where: {
        assignmentId: assignmentForSlot.id,
        semesterId: activeSem.id,
      },
      select: { classGroup: true }
    });

    if (!slot) {
      return res.status(404).json({ error: 'No timetable slot found for this subject and semester' });
    }
    const classGroup = slot.classGroup;

    // Get the assignment (SubjectSectionAssignment) for this subject and classGroup
    const targetAssignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        classGroup
      },
      include: {
        subject: { select: { code: true, name: true } },
        theoryFaculty: { select: { name: true } },
        labFaculty: { select: { name: true } }
      }
    });

    if (!targetAssignment) {
      return res.status(404).json({ error: 'Subject section assignment not found' });
    }

    const [students, marks] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'student', classGroup },
        orderBy: { id: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.mark.findMany({
        where: {
          assignmentId: targetAssignment.id,
          type: assessmentType,
          semesterId: activeSem.id,
        },
        select: { studentId: true, score: true },
      }),
    ]);

    const marksMap = new Map(marks.map(mark => [mark.studentId, mark.score]));
    const assessmentLabel = assessmentType
      .replace(/(\d+)/, '-$1')
      .replace(/^./, character => character.toUpperCase());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${targetAssignment.subject.code}-${assessmentType}-marks.pdf"`,
    );

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Internal Marks', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`${targetAssignment.subject.code} - ${targetAssignment.subject.name}`, { align: 'center' });
    doc.text(`Class: ${classGroup}    Assessment: ${assessmentLabel}`, { align: 'center' });
    doc.moveDown(1.5);

    const columns = [
      { label: 'USN', x: 48, width: 150 },
      { label: 'Name', x: 198, width: 260 },
      { label: 'Marks', x: 458, width: 90 },
    ];
    const rowHeight = 24;
    const drawHeader = () => {
      const top = doc.y;
      doc.save().fillColor('#1d4ed8').rect(48, top, 500, rowHeight).fill().restore();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white');
      columns.forEach(column => doc.text(column.label, column.x + 8, top + 7, { width: column.width - 16 }));
      doc.y = top + rowHeight;
    };
    const drawRow = (student: { id: string; name: string }, score: number | null) => {
      if (doc.y + rowHeight > doc.page.height - 48) {
        doc.addPage();
        drawHeader();
      }

      const top = doc.y;
      if (students.indexOf(student) % 2 === 0) {
        doc.save().fillColor('#eff6ff').rect(48, top, 500, rowHeight).fill().restore();
      }
      doc.font('Helvetica').fontSize(10).fillColor('#111827');
      doc.text(student.id, 56, top + 7, { width: 134, ellipsis: true });
      doc.text(student.name, 206, top + 7, { width: 244, ellipsis: true });
      doc.text(score === null ? '—' : String(score), 466, top + 7, { width: 74, align: 'right' });
      doc.y = top + rowHeight;
    };

    drawHeader();
    students.forEach(student => drawRow(student, marksMap.get(student.id) ?? null));
    doc.end();
  } catch (error) {
    console.error('Error exporting teacher marks PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error while exporting marks' });
    }
    res.end();
  }
};

export const saveTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, type, maxScore, records } = req.body;
  const teacherId = req.user?.id;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found' });
  }

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find the assignment for this subject and teacher in the active semester to get classGroup
    const assignmentForSlot = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        OR: [
          { theoryFacultyId: teacherId },
          { labFacultyId: teacherId }
        ]
      },
      include: {
        subject: { select: { code: true, name: true, type: true } }
      }
    });

    if (!assignmentForSlot) {
      return res.status(404).json({ error: 'Subject section assignment not found for this teacher and subject' });
    }

    // Find the timetable slot for this assignment in the active semester to get classGroup
    const slot = await prisma.timetableSlot.findFirst({
      where: {
        assignmentId: assignmentForSlot.id,
        semesterId: activeSem.id,
      },
      select: { classGroup: true }
    });

    if (!slot) {
      return res.status(404).json({ error: 'No timetable slot found for this subject and semester' });
    }
    const classGroup = slot.classGroup;

    // Verify the assignment exists for this subject and classGroup
    const targetAssignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        classGroup
      }
    });

    if (!targetAssignment) {
      return res.status(404).json({ error: 'Subject section assignment not found' });
    }

    // Bulk upsert using transaction
    await prisma.$transaction(
      records.map((rec: { studentId: string; score: number | null }) =>
        prisma.mark.upsert({
          where: {
            studentId_assignmentId_type_semesterId: {
              studentId: rec.studentId,
              assignmentId: targetAssignment.id,
              type,
              semesterId: activeSem.id,
            },
          },
          update: {
            score: rec.score,
            maxScore,
          },
          create: {
            type,
            score: rec.score,
            maxScore,
            updatedAt: new Date(),
            student: {
              connect: { id: rec.studentId }
            },
            assignment: {
              connect: { id: targetAssignment.id }
            },
            semester: {
              connect: { id: activeSem.id }
            }
          },
        })
      )
    );

    return res.status(200).json({ message: 'Internal marks saved successfully' });
  } catch (error) {
    console.error('Error saving teacher internal marks:', error);
    return res.status(500).json({ error: 'Internal server error while saving internal marks' });
  }
};