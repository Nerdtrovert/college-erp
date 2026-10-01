import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { semesterNumberFromUsn } from '../constants/program';

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
  } catch (error: any) {
    console.error('Error updating semester:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
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
          startTime: sess.startTime,
          endTime: sess.endTime,
          room: sess.room,
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

export const promoteStudentsToSemester = async (req: AuthRequest, res: Response) => {
  const targetSemesterId = String(req.params.id);
  const sourceSemesterId = typeof req.body.sourceSemesterId === 'string' ? req.body.sourceSemesterId : undefined;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const targetSemester = await tx.semester.findUnique({ where: { id: targetSemesterId } });
      if (!targetSemester) {
        throw new Error('Target semester not found');
      }
      if (sourceSemesterId === targetSemesterId) {
        throw new Error('Source and target semesters must be different');
      }

      const sourceSemester = sourceSemesterId
        ? await tx.semester.findUnique({ where: { id: sourceSemesterId } })
        : targetSemester.startDate
          ? await tx.semester.findFirst({
              where: {
                id: { not: targetSemesterId },
                startDate: { lt: targetSemester.startDate },
              },
              orderBy: { startDate: 'desc' },
            })
          : null;
      if (!sourceSemester) {
        throw new Error('Source semester not found');
      }
      if (targetSemester.startDate && sourceSemester.startDate && sourceSemester.startDate >= targetSemester.startDate) {
        throw new Error('Source semester must occur before the target semester');
      }

      const enrollments = await tx.studentEnrollment.findMany({
        where: { semesterId: sourceSemester.id },
      });
      if (enrollments.length === 0) {
        throw new Error('No student enrollments found in the source semester');
      }

      let promoted = 0;
      let completed = 0;
      for (const enrollment of enrollments) {
        const semesterNumber = semesterNumberFromUsn(
          enrollment.studentId,
          targetSemester.startDate || targetSemester.name,
        ) ?? Math.min(enrollment.semesterNumber + 1, 8);
        if (semesterNumber > 8 || enrollment.semesterNumber >= 8) {
          await tx.user.update({
            where: { id: enrollment.studentId },
            data: { isActive: false },
          });
          completed++;
          continue;
        }
        await tx.studentEnrollment.upsert({
          where: {
            studentId_semesterId: {
              studentId: enrollment.studentId,
              semesterId: targetSemester.id,
            },
          },
          update: {
            semesterNumber,
            program: enrollment.program,
            classGroup: enrollment.classGroup,
          },
          create: {
            studentId: enrollment.studentId,
            semesterId: targetSemester.id,
            semesterNumber,
            program: enrollment.program,
            classGroup: enrollment.classGroup,
          },
        });
        await tx.user.update({
          where: { id: enrollment.studentId },
          data: {
            semesterId: targetSemester.id,
            program: enrollment.program,
            classGroup: enrollment.classGroup,
            department: null,
            isActive: true,
          },
        });
        promoted++;
      }

      return {
        sourceSemester: sourceSemester.name,
        targetSemester: targetSemester.name,
        promoted,
        completed,
      };
    });

    return res.status(200).json({
      message: `${result.promoted} students enrolled in ${result.targetSemester}; ${result.completed} students completed semester 8 and were deactivated. Previous enrollment history was preserved.`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error promoting students to semester:', error);
    const message = error.message || 'Internal server error';
    const status = message.includes('not found') || message.includes('No student') ? 400 : 500;
    return res.status(status).json({ error: message });
  }
};