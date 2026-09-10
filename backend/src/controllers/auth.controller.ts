import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { config } from '../config';
import { AuthRequest } from '../types';
import { parseExcel, parseWord, parsePDF, extractStudentsFromText } from '../utils/fileParser';
import * as path from 'path';
import * as fs from 'fs';

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
  const { id, password, role } = req.body;

  try {
    // Find the user by ID (roll number or faculty ID)
    const user = await prisma.user.findUnique({
      where: { id },
    });

    // Check if user exists and roles match
    // Use same error message regardless of whether user exists or password is wrong
    const roleMatches = role === 'supervisor'
      ? user?.role === 'dean' || user?.role === 'principal' || user?.role === 'hod'
      : user?.role === role;
    if (!user || !roleMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
        role: user.role,
        name: user.name,
        department: user.department,
        classGroup: user.classGroup,
      } as any,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
        classGroup: user.classGroup,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { id, name, password, role, department, classGroup } = req.body;

  try {
    // Check if user ID is already registered
    // Use generic error message to prevent user enumeration
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user record
    const user = await prisma.user.create({
      data: {
        id,
        name,
        password: hashedPassword,
        role,
        department,
        classGroup: role === 'student' ? classGroup : null,
      },
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
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
        name: true,
        role: true,
        department: true,
        classGroup: true,
        semesterId: true,
        semester: { select: { id: true, name: true } },
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
  const { name, password, role, department, classGroup, semesterId } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (department) data.department = department;
    if (classGroup !== undefined) data.classGroup = classGroup;
    if (semesterId !== undefined) data.semesterId = semesterId;
    if (password) {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: id as string },
      data,
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        department: user.department,
        classGroup: user.classGroup,
        semesterId: user.semesterId,
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

    // Check if assigned to any subject
    const assignedSubject = await prisma.subject.findFirst({
      where: { facultyId: facultyIdStr }
    });
    if (assignedSubject) {
      return res.status(400).json({
        error: `Cannot delete faculty member because they teach "${assignedSubject.name}" (${assignedSubject.code}). Please reassign the course first.`
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

  const { semesterId, defaultDepartment, defaultClassGroup } = req.body;

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
    const defaultPassword = await bcrypt.hash('student123', 12);

    let parsedStudents: { id: string; name: string; department: string; classGroup: string }[] = [];

    if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel file
      const rows = parseExcel(fileBuffer);
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
          classGroup: String(
            row['Section'] ||
            row['Class'] ||
            row['Class Group'] ||
            row['classGroup'] ||
            row['section'] ||
            defaultClassGroup ||
            'CSE-B'
          ).trim(),
        }))
        .filter((s: any) => s.id && s.name);
    } else if (ext === '.docx' || ext === '.doc') {
      // Parse Word file
      const text = await parseWord(fileBuffer);
      parsedStudents = extractStudentsFromText(text);
      // Apply defaults where missing
      parsedStudents = parsedStudents.map(s => ({
        ...s,
        department: s.department || defaultDepartment || 'Computer Science & Engineering',
        classGroup: s.classGroup || defaultClassGroup || 'CSE-B',
      }));
    } else if (ext === '.pdf') {
      // Parse PDF file
      const text = await parsePDF(fileBuffer);
      parsedStudents = extractStudentsFromText(text);
      // Apply defaults where missing
      parsedStudents = parsedStudents.map(s => ({
        ...s,
        department: s.department || defaultDepartment || 'Computer Science & Engineering',
        classGroup: s.classGroup || defaultClassGroup || 'CSE-B',
      }));
    } else {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ error: 'Unsupported file type. Please upload Excel (.xlsx/.xls), Word (.docx/.doc), or PDF (.pdf)' });
    }

    // Clean up uploaded file
    await removeUploadedFile(req.file.path);

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
              department: student.department,
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
              role: 'student',
              department: student.department,
              classGroup: student.classGroup,
              semesterId,
            },
          });
          results.success.push({ id: student.id, name: student.name });
        }
      } catch (err: any) {
        results.errors.push({ ...student, reason: err.message || 'Unknown error' });
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
