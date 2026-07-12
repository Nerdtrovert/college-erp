import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getSemesters = async (_req: Request, res: Response) => {
  try {
    const semesters = await prisma.semester.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(semesters);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSemester = async (req: AuthRequest, res: Response) => {
  const { name, startDate, endDate, status } = req.body;
  try {
    const semester = await prisma.semester.create({
      data: {
        name,
        startDate,
        endDate,
        status: status as 'ACTIVE' | 'UPCOMING' | 'ARCHIVED',
      },
    });
    return res.status(201).json(semester);
  } catch (error) {
    console.error('Error creating semester:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSemester = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate, status } = req.body;
  try {
    const semester = await prisma.semester.update({
      where: { id: id as string },
      data: {
        name,
        startDate,
        endDate,
        status: status as 'ACTIVE' | 'UPCOMING' | 'ARCHIVED',
      },
    });
    return res.status(200).json(semester);
  } catch (error) {
    console.error('Error updating semester:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSemesterById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const semester = await prisma.semester.findUnique({
      where: { id: id as string },
      include: {
        attendanceSessions: { include: { records: true } },
        marks: true,
        timetableSlots: true,
      },
    });
    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }
    return res.status(200).json(semester);
  } catch (error) {
    console.error('Error fetching semester by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const copySemester = async (req: AuthRequest, res: Response) => {
  const { sourceSemesterId } = req.body;
  const { name, startDate, endDate, status } = req.body; // new semester data
  const tx = await prisma.$transaction(async (prisma) => {
    // 1. create new semester
    const newSem = await prisma.semester.create({
      data: {
        name,
        startDate,
        endDate,
        status: status as 'ACTIVE' | 'UPCOMING' | 'ARCHIVED',
      },
    });
    // 2. copy attendance sessions from source semester
    const sourceSessions = await prisma.attendanceSession.findMany({
      where: { semesterId: sourceSemesterId },
      include: { records: true },
    });
    for (const sess of sourceSessions) {
      const newSess = await prisma.attendanceSession.create({
        data: {
          subjectCode: sess.subjectCode,
          date: sess.date,
          classGroup: sess.classGroup,
          semesterId: newSem.id,
        },
      });
      // copy records
      for (const rec of sess.records) {
        await prisma.attendanceRecord.create({
          data: {
            sessionId: newSess.id,
            studentId: rec.studentId,
            status: rec.status,
          },
        });
      }
    }
    // 3. copy marks
    const sourceMarks = await prisma.mark.findMany({
      where: { semesterId: sourceSemesterId },
    });
    for (const m of sourceMarks) {
      await prisma.mark.create({
        data: {
          studentId: m.studentId,
          subjectCode: m.subjectCode,
          type: m.type,
          score: m.score,
          maxScore: m.maxScore,
          semesterId: newSem.id,
        },
      });
    }
    // 4. copy timetable slots
    const sourceSlots = await prisma.timetableSlot.findMany({
      where: { semesterId: sourceSemesterId },
    });
    for (const s of sourceSlots) {
      await prisma.timetableSlot.create({
        data: {
          day: s.day,
          slotIndex: s.slotIndex,
          subjectCode: s.subjectCode,
          room: s.room,
          classGroup: s.classGroup,
          teacherId: s.teacherId,
          semesterId: newSem.id,
        },
      });
    }
    return newSem;
  });
  return res.status(201).json(tx);
};