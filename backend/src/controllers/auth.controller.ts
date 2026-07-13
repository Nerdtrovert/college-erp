import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { config } from '../config';
import { AuthRequest } from '../types';

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
      ? user?.role === 'dean' || user?.role === 'principal'
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
    ['student', 'teacher', 'dean', 'principal'].includes(r)
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
  const { name, password, role, department } = req.body;

  try {
    const data: any = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (department) data.department = department;
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
