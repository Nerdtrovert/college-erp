import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
    return res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  const { code, name, facultyId, classGroup, type } = req.body;

  if (!code || !name || !facultyId || !classGroup || !type) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if subject code already exists
    const existing = await prisma.subject.findUnique({
      where: { code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Subject with this code already exists' });
    }

    // Verify faculty exists and is a teacher
    const faculty = await prisma.user.findUnique({
      where: { id: facultyId },
    });
    if (!faculty || faculty.role !== 'teacher') {
      return res.status(400).json({ error: 'Selected faculty member must be a teacher' });
    }

    const subject = await prisma.subject.create({
      data: {
        code,
        name,
        facultyId,
        classGroup,
        type,
      },
    });

    return res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  const { code } = req.params;
  const { name, facultyId, classGroup, type } = req.body;

  try {
    const subject = await prisma.subject.update({
      where: { code },
      data: {
        name,
        facultyId,
        classGroup,
        type,
      },
    });
    return res.status(200).json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  const { code } = req.params;

  try {
    await prisma.subject.delete({
      where: { code },
    });
    return res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
