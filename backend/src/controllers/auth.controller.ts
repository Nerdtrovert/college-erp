import { parseExcel, parseWord, parsePDF, extractStudentsFromText } from "../utils/fileParser";

import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { config } from '../config';
import { AuthRequest } from '../types';
import * as path from 'path';
import * as fs from 'fs';
import { batchYearsFromUsn, isStudentProgram, programFromLegacyDepartment, programFromSection, semesterNumberFromUsn } from '../constants/program';

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

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find the user by email
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Student portal access is inactive. Contact administration for backlog support.' });
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        program: user.program,
        classGroup: user.classGroup,
      } as any,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        program: user.program,
        classGroup: user.classGroup,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { name, password, role, department, program, classGroup, semesterId, numberOfBacklogs, backlogSubjects, email } = req.body;
  const identifier = role === 'student'
    ? String(email).toUpperCase()
    : String(email).trim();

  try {
    // Check if user with this email is already registered
    // Use generic error message to prevent user enumeration
    const existingUser = await prisma.user.findUnique({
      where: { email: identifier.toLowerCase() },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const batch = role === 'student' ? batchYearsFromUsn(identifier) : null;
    const enrollmentSemester = role === 'student' && semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : null;
    const semesterNumber = role === 'student' && enrollmentSemester
      ? semesterNumberFromUsn(identifier, enrollmentSemester.startDate || '')
      : null;
    if (role === 'student' && semesterId && (!enrollmentSemester || !semesterNumber)) {
      return res.status(400).json({ error: 'Unable to derive semester number from the student USN and semester dates' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: identifier.toLowerCase(),
          name,
          password: hashedPassword,
          role,
          isActive: true,
          batchStartYear: batch?.startYear ?? null,
          batchEndYear: batch?.endYear ?? null,
          department: role === 'student' ? null : department,
          program: role === 'student' ? program : null,
          classGroup: role === 'student' ? classGroup : null,
          semesterId: role === 'student' ? (semesterId ?? null) : null,
        },
      });
      if (role === 'student' && semesterId && semesterNumber) {
        await tx.studentEnrollment.create({
          data: {
            studentId: createdUser.id,
            semesterId,
            semesterNumber,
            program: program!,
            classGroup: classGroup!,
          },
        });
      }
      return createdUser;
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
        program: user.program,
        classGroup: user.classGroup,
      },
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.status(200).json({ user: authReq.user });
};

export const getUsersByRole = async (req: AuthRequest, res: Response) => {
  const { role } = req.query;

  // Validate role parameter
  if (!role || typeof role !== 'string') {
    return res.status(400).json({ error: 'Role parameter is required' });
  }

  // Handle comma-separated roles (e.g., "teacher,dean,principal")
  const roles = role.split(',').map(r => r.trim()).filter(r =>
    ['student', 'teacher', 'dean', 'principal', 'hod'].includes(r)
  );

  if (roles.length === 0) {
    return res.status(400).json({ error: 'At least one valid role must be specified' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: roles as any[], // Convert to Prisma enum array
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        program: true,
        classGroup: true,
        semesterId: true,
        isActive: true,
        batchStartYear: true,
        batchEndYear: true,
        semester: { select: { id: true, name: true } },
        enrollments: {
          select: {
            id: true,
            semesterId: true,
            semesterNumber: true,
            program: true,
            classGroup: true,
            semester: { select: { id: true, name: true } },
          },
          orderBy: { semester: { createdAt: 'desc' } },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = Array.isArray(id) ? id[0] : id;
  const { name, password, role, department, program, classGroup, semesterId } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextRole = role ?? existing.role;
    const nextProgram = program ?? existing.program;
    const nextClassGroup = classGroup ?? existing.classGroup;
    const isStudent = nextRole === 'student';

    if (isStudent && (!nextProgram || !nextClassGroup)) {
      return res.status(400).json({ error: 'Students must have both program and class group' });
    }
    if (!isStudent && !department && !existing.department) {
      return res.status(400).json({ error: 'Department is required for faculty and supervisors' });
    }

    const data: any = {
      department: isStudent ? null : (department ?? existing.department),
      isActive: isStudent ? (existing.isActive ?? true) : true,
      batchStartYear: isStudent ? batchYearsFromUsn(userId)?.startYear : null,
      batchEndYear: isStudent ? batchYearsFromUsn(userId)?.endYear : null,
      program: isStudent ? nextProgram : null,
      classGroup: isStudent ? nextClassGroup : null,
    };
    if (name) data.name = name;
    if (role) data.role = role;
    if (semesterId !== undefined) data.semesterId = semesterId;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const enrollmentSemester = isStudent && semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : null;
    const derivedSemesterNumber = enrollmentSemester
      ? semesterNumberFromUsn(userId, enrollmentSemester.startDate || '')
      : null;
    if (isStudent && semesterId && !derivedSemesterNumber) {
      return res.status(400).json({ error: 'Unable to derive semester number from the student USN and semester dates' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({ where: { id: userId }, data });
      if (isStudent && semesterId && derivedSemesterNumber) {
        await tx.studentEnrollment.upsert({
          where: { studentId_semesterId: { studentId: updatedUser.id, semesterId } },
          update: {
            semesterNumber: derivedSemesterNumber,
            program: updatedUser.program!,
            classGroup: updatedUser.classGroup!,
          },
          create: {
            studentId: updatedUser.id,
            semesterId,
            semesterNumber: derivedSemesterNumber,
            program: updatedUser.program!,
            classGroup: updatedUser.classGroup!,
          },
        });
      }
      return updatedUser;
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
        program: user.program,
        classGroup: user.classGroup,
        semesterId: user.semesterId,
        enrollments: await prisma.studentEnrollment.findMany({
          where: { studentId: user.id },
          include: { semester: { select: { id: true, name: true } } },
          orderBy: { semester: { createdAt: 'desc' } },
        }),
      },
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during user update' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const facultyIdStr = id as string;

    // Check if assigned to any subject (as theory or lab faculty)
    const assignedAssignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        OR: [
          { theoryFacultyId: facultyIdStr },
          { labFacultyId: facultyIdStr }
        ]
      },
      include: {
        subject: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });
    if (assignedAssignment) {
      return res.status(400).json({
        error: `Cannot delete faculty member because they teach "${assignedAssignment.subject.name}" (${assignedAssignment.subject.code}). Please reassign the course first.`
      });
    }

    // Check if assigned to any timetable slot
    const assignedSlot = await prisma.timetableSlot.findFirst({
      where: { teacherId: facultyIdStr }
    });
    if (assignedSlot) {
      return res.status(400).json({
        error: `Cannot delete faculty member because they have classes scheduled on ${assignedSlot.day} (Period ${assignedSlot.slotIndex + 1}). Please reassign the schedule first.`
      });
    }

    await prisma.user.delete({
      where: { id: facultyIdStr },
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete faculty member due to linked active records (subjects, timetables, or announcements).'
      });
    }
    return res.status(500).json({ error: error.message || 'Internal server error during user deletion' });
  }
};

export const uploadStudents = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { semesterId, defaultDepartment, defaultProgram, defaultClassGroup } = req.body;

  if (!semesterId) {
    // Clean up uploaded file
    await removeUploadedFile(req.file.path);
    return res.status(400).json({ error: 'semesterId is required' });
  }
  // Verify semester exists
  const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  if (!semester) {
    await removeUploadedFile(req.file.path);
    return res.status(404).json({ error: 'Semester not found' });
  }
  const semesterNumberForStudent = (studentId: string): number => {
    const derived = semesterNumberFromUsn(studentId, semester.startDate || '');
    if (!derived) {
      throw new Error(`Unable to derive semester number from USN ${studentId} and the selected semester start date`);
    }
    return derived;
  };

  // File type validation - check both extension and MIME type
  const allowedExtensions = ['.xlsx', '.xls', '.docx', '.doc', '.pdf'];
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/octet-stream', // legacy .xls/.doc clients
    'application/pdf' // .pdf
  ];

  if (!allowedExtensions.includes(ext)) {
    await removeUploadedFile(req.file.path);
    return res.status(400).json({ error: 'Unsupported file type. Please upload Excel (.xlsx/.xls), Word (.docx/.doc), or PDF (.pdf)' });
  }

  if (!allowedMimeTypes.includes(req.file.mimetype.toLowerCase())) {
    await removeUploadedFile(req.file.path);
    return res.status(400).json({ error: 'File extension and MIME type do not match' });
  }

  try {
    const fileBuffer = await fs.promises.readFile(req.file.path);
    if (!hasExpectedFileSignature(fileBuffer, ext)) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ error: 'The uploaded file does not match its declared format' });
    }
    const defaultPassword = await bcrypt.hash('student123', 10);

    let parsedStudents: { id: string; name: string; department?: string; program?: string; classGroup: string }[] = [];

    if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel file
      const rows = await parseExcel(fileBuffer);
      parsedStudents = rows
        .map((row: any) => ({
          id: String(
            row['Roll No'] ||
            row['Roll Number'] ||
            row['USN'] ||
            row['ID'] ||
            row['roll_no'] ||
            row['roll'] ||
            Object.values(row)[0] ||
            ''
          ).trim().toUpperCase(),
          name: String(
            row['Name'] ||
            row['Student Name'] ||
            row['Full Name'] ||
            row['name'] ||
            Object.values(row)[1] ||
            ''
          ).trim(),
          department: String(
            row['Department'] ||
            row['Dept'] ||
            row['Branch'] ||
            row['department'] ||
            defaultDepartment ||
            'Computer Science & Engineering'
          ).trim(),
          program: String(
            row['Program'] ||
            row['Course'] ||
            row['Branch'] ||
            defaultProgram ||
            'CSE'
          ).trim(),
          classGroup: String(
            row['Section'] ||
            row['Class'] ||
            row['Class Group'] ||
            row['classGroup'] ||
            row['section'] ||
            defaultClassGroup ||
            'CSE-B'
          ).trim(),
          numberOfBacklogs: parseInt(row['Backlogs'] || row['Number of Backlogs'] || row['numberOfBacklogs'] || '0') || 0,
          backlogSubjects: (row['Backlog Subjects'] || row['backlogSubjects'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
        }))
        .filter((s: any) => s.id && s.name && /^1HC\d{2}[A-Z]{2}\d{3}$/.test(s.id));
    } else if (ext === '.docx' || ext === '.doc') {
      // Parse Word file
      const text = await parseWord(fileBuffer);
      parsedStudents = extractStudentsFromText(text);
      // Apply defaults where missing
      parsedStudents = parsedStudents.map((s: any) => ({
        ...s,
        department: s.department || defaultDepartment || 'Computer Science & Engineering',
        program: s.program || defaultProgram || programFromLegacyDepartment(s.department) || 'CSE',
        classGroup: s.classGroup || defaultClassGroup || 'CSE-B',
        numberOfBacklogs: s.numberOfBacklogs || 0,
        backlogSubjects: s.backlogSubjects || [],
      }));
    } else if (ext === '.pdf') {
      // Parse PDF file
      const text = await parsePDF(fileBuffer);
      parsedStudents = extractStudentsFromText(text);
      // Apply defaults where missing
      parsedStudents = parsedStudents.map((s: any) => ({
        ...s,
        department: s.department || defaultDepartment || 'Computer Science & Engineering',
        program: s.program || defaultProgram || programFromLegacyDepartment(s.department) || 'CSE',
        classGroup: s.classGroup || defaultClassGroup || 'CSE-B',
        numberOfBacklogs: s.numberOfBacklogs || 0,
        backlogSubjects: s.backlogSubjects || [],
      }));
    } else {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ error: 'Unsupported file type. Please upload Excel (.xlsx/.xls), Word (.docx/.doc), or PDF (.pdf)' });
    }

    parsedStudents = parsedStudents.filter(student =>
      student.id && student.name && student.id.trim() !== '' && student.name.trim() !== ''
    );

    if (parsedStudents.length === 0) {
      return res.status(400).json({
        error: 'No valid student records found in the uploaded file. Please check the file format.',
      });
    }

    const results: { success: any[]; updated: any[]; skipped: any[]; errors: any[] } = {
      success: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    // Batch process students to fix N+1 query problem
    try {
      // Extract all student IDs
      const studentIds = parsedStudents.map(s => s.id);

      // Fetch all existing users in one query
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, role: true }
      });

      // Create a map of existing users by ID for quick lookup
      const existingUserMap = new Map(existingUsers.map(user => [user.id, user.role]));

      // Split students into toCreate, toUpdate, and toSkip
      const toCreate: typeof parsedStudents = [];
      const toUpdate: typeof parsedStudents = [];
      const toSkip: typeof parsedStudents = [];

      for (const student of parsedStudents) {
        if (!student.id || !student.name) {
          results.errors.push({ ...student, reason: 'Missing ID or Name' });
          continue;
        }

        const existingRole = existingUserMap.get(student.id);

        if (existingRole !== undefined) {
          // User exists
          if (existingRole !== 'student') {
            // Skip if user exists but is not a student
            toSkip.push(student);
            results.skipped.push({ ...student, reason: `User ${student.id} exists with role '${existingRole}' — skipped` });
          } else {
            // User exists and is a student - prepare for update
            toUpdate.push(student);
          }
        } else {
          // User doesn't exist - prepare for creation
          toCreate.push(student);
        }
      }

      // Batch create new students
      if (toCreate.length > 0) {
        const createData = toCreate.map(student => ({
          id: student.id,
          name: student.name,
          password: defaultPassword,
          role: 'student' as any,
          isActive: true,
          batchStartYear: batchYearsFromUsn(student.id)?.startYear,
          batchEndYear: batchYearsFromUsn(student.id)?.endYear,
          department: null,
          program: isStudentProgram(student.program) && (programFromSection(student.classGroup) === student.program || !programFromSection(student.classGroup))
            ? student.program
            : (programFromSection(student.classGroup) || 'CSE'),
          classGroup: student.classGroup,
          semesterId,
        }));

        await prisma.$transaction([
          prisma.user.createMany({ data: createData }),
          prisma.studentEnrollment.createMany({
            data: toCreate.map(student => ({
              studentId: student.id,
              semesterId,
              semesterNumber: semesterNumberForStudent(student.id),
              program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
              classGroup: student.classGroup,
            })),
          }),
        ]);

        // Add to success results
        results.success.push(...toCreate.map(student => ({ id: student.id, name: student.name })));
      }

      // Batch update existing students grouped by section and program.
      if (toUpdate.length > 0) {
        // Group students by classGroup and department for batch updates
        const updateGroups = new Map<string, typeof parsedStudents>();

        for (const student of toUpdate) {
          const key = `${student.classGroup}|${student.program}`;
          if (!updateGroups.has(key)) {
            updateGroups.set(key, []);
          }
          updateGroups.get(key)!.push(student);
        }

        // Update each group
        for (const [key, students] of updateGroups.entries()) {
          const [classGroup, program] = key.split('|');

          await prisma.$transaction(students.map(student => prisma.user.update({
            where: { id: student.id },
            data: {
              semesterId,
              classGroup,
              department: null,
              isActive: true,
              batchStartYear: batchYearsFromUsn(student.id)?.startYear,
              batchEndYear: batchYearsFromUsn(student.id)?.endYear,
              program: isStudentProgram(program) ? program : (programFromSection(classGroup) || 'CSE')
            }
          })));
          await Promise.all(students.map(student => prisma.studentEnrollment.upsert({
            where: { studentId_semesterId: { studentId: student.id, semesterId } },
            update: {
              semesterNumber: semesterNumberForStudent(student.id),
              program: isStudentProgram(program) ? program : (programFromSection(classGroup) || 'CSE'),
              classGroup,
            },
            create: {
              studentId: student.id,
              semesterId,
              semesterNumber: semesterNumberForStudent(student.id),
              program: isStudentProgram(program) ? program : (programFromSection(classGroup) || 'CSE'),
              classGroup,
            },
          })));

          // Add to updated results
          results.updated.push(...students.map(student => ({ id: student.id, name: student.name })));
        }
      }

    } catch (batchError: any) {
      console.error('Error in batch processing:', batchError);
      // Fall back to individual processing if batch fails
      for (const student of parsedStudents) {
        if (!student.id || !student.name) {
          results.errors.push({ ...student, reason: 'Missing ID or Name' });
          continue;
        }

        try {
          // Check if user already exists
          const existing = await prisma.user.findUnique({ where: { id: student.id } });

          if (existing) {
            if (existing.role !== 'student') {
              results.skipped.push({ ...student, reason: `User ${student.id} exists with role '${existing.role}' — skipped` });
              continue;
            }
            // Update existing student's semester, section, department
            await prisma.user.update({
              where: { id: student.id },
              data: {
                semesterId,
                classGroup: student.classGroup,
                department: null,
                isActive: true,
                batchStartYear: batchYearsFromUsn(student.id)?.startYear,
                batchEndYear: batchYearsFromUsn(student.id)?.endYear,
                program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
              },
            });
            await prisma.studentEnrollment.upsert({
              where: { studentId_semesterId: { studentId: student.id, semesterId } },
              update: {
                semesterNumber: semesterNumberForStudent(student.id),
                program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
                classGroup: student.classGroup,
              },
              create: {
                studentId: student.id,
                semesterId,
                semesterNumber: semesterNumberForStudent(student.id),
                program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
                classGroup: student.classGroup,
              },
            });
            results.updated.push({ id: student.id, name: student.name });
          } else {
            // Create new student
            await prisma.user.create({
              data: {
                id: student.id,
                name: student.name,
                password: defaultPassword,
                role: 'student' as any,
                isActive: true,
                batchStartYear: batchYearsFromUsn(student.id)?.startYear,
                batchEndYear: batchYearsFromUsn(student.id)?.endYear,
                department: null,
                program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
                classGroup: student.classGroup,
                semesterId,
              },
            });
            await prisma.studentEnrollment.create({
              data: {
                studentId: student.id,
                semesterId,
                semesterNumber: semesterNumberForStudent(student.id),
                program: isStudentProgram(student.program) ? student.program : (programFromSection(student.classGroup) || 'CSE'),
                classGroup: student.classGroup,
              },
            });
            results.success.push({ id: student.id, name: student.name });
          }
        } catch (err: any) {
          results.errors.push({ ...student, reason: err.message || 'Unknown error' });
        }
      }
    }

      return res.status(200).json({
        message: `Import complete: ${results.success.length} created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
        summary: {
          total: parsedStudents.length,
          created: results.success.length,
          updated: results.updated.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
        details: results,
      });
  } catch (error: any) {
    console.error('Error processing student upload:', error);
    // Clean up file if still there
    if (req.file && fs.existsSync(req.file.path)) {
      await removeUploadedFile(req.file.path);
    }
    return res.status(500).json({ error: error.message || 'Internal server error during student upload' });
  }
};