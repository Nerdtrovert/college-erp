import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  const classGroup = req.user?.classGroup;

  if (!studentId || !classGroup) {
    return res.status(400).json({ error: 'Invalid student ID or class section group mapping' });
  }

  try {
    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Get all subjects corresponding to the student's class group section
    const subjects = await prisma.subject.findMany({
      where: { classGroup },
      include: {
        faculty: {
          select: { name: true },
        },
        attendanceSessions: {
          where: {
            semesterId: activeSem.id,
          },
          include: {
            records: {
              where: { studentId },
            },
          },
        },
      },
    });

    // Map subjects into structure required by frontend
    const attendanceData = subjects.map((sub) => {
      const sessions = sub.attendanceSessions.map((session) => {
        const studentRecord = session.records[0];
        return {
          date: session.date,
          status: studentRecord ? studentRecord.status : 'absent',
        };
      });

      // Filter and count
      const present = sessions.filter((s) => s.status === 'present').length;
      const total = sessions.length;
      const absent = total - present;

      return {
        name: sub.name,
        code: sub.code,
        faculty: sub.faculty.name,
        present,
        absent,
        total,
        sessions,
      };
    });

    return res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return res.status(500).json({ error: 'Internal server error during attendance retrieval' });
  }
};

export const getTeacherAttendance = async (req: AuthRequest, res: Response) => {
  const { subjectCode } = req.params as { subjectCode: string };
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));

  try {
    const subject = await prisma.subject.findUnique({
      where: { code: subjectCode },
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Get all students enrolled in this subject's class section
    const students = await prisma.user.findMany({
      where: { role: 'student', classGroup: subject.classGroup },
      orderBy: { id: 'asc' },
    });

    // Get existing session attendance records if saved (for active semester)
    const session = await prisma.attendanceSession.findFirst({
      where: {
        subjectCode,
        date,
        classGroup: subject.classGroup,
        semesterId: activeSem.id,
      },
      include: {
        records: true,
      },
    });

    const attendanceRecordsMap = session
      ? Object.fromEntries((session as any).records.map((r: any) => [r.studentId, r.status]))
      : {};

    const studentList = students.map((stud) => ({
      roll: stud.id,
      name: stud.name,
      status: attendanceRecordsMap[stud.id] || 'present', // Default to present for UI ease
    }));

    return res.status(200).json({
      subjectCode,
      classGroup: subject.classGroup,
      date,
      students: studentList,
    });
  } catch (error) {
    console.error('Error fetching teacher attendance view:', error);
    return res.status(500).json({ error: 'Internal server error during attendance checklist fetch' });
  }
};

export const saveTeacherAttendance = async (req: AuthRequest, res: Response) => {
  const { subjectCode, date, classGroup, records } = req.body;

  try {
    // 1. Verify subject
    const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
    if (!subject) {
      return res.status(404).json({ error: 'Subject code not found' });
    }

    // Get active semester
    const activeSem = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // 2. Upsert the session for the given subject, date, classGroup, and active semester
    const session = await prisma.attendanceSession.upsert({
      where: {
        subjectCode_date_classGroup_semesterId: {
          subjectCode,
          date,
          classGroup,
          semesterId: activeSem.id,
        },
      },
      update: {},
      create: {
        subjectCode,
        date,
        classGroup,
        semesterId: activeSem.id,
      },
    });

    // 3. Upsert attendance records inside a transaction
    await prisma.$transaction(
      records.map((rec: { studentId: string; status: string }) =>
        prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: rec.studentId,
            },
          },
          update: { status: rec.status },
          create: {
            sessionId: session.id,
            studentId: rec.studentId,
            status: rec.status,
          },
        })
      )
    );

    return res.status(200).json({ message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving teacher attendance:', error);
    return res.status(500).json({ error: 'Internal server error while saving attendance records' });
  }
};