import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { semesterService } from '../services/SemesterService';

const PERIOD_TIMES = [
  ['08:30', '09:30'],
  ['09:30', '10:30'],
  [null, null],
  ['11:00', '12:00'],
  ['12:00', '13:00'],
  [null, null],
  ['13:45', '14:45'],
  ['14:45', '15:45'],
] as const;

const getDayName = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

export const getTeacherClasses = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user?.id;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));

  if (!teacherId) return res.status(400).json({ error: 'Teacher ID not found' });

  try {
    const slots = await prisma.timetableSlot.findMany({
      where: {
        teacherId,
        day: getDayName(date),
        assignmentId: { not: null },
        semester: { status: 'ACTIVE' },
      },
      include: {
        assignment: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { slotIndex: 'asc' },
    });

    const classes = await Promise.all(slots.map(async (slot) => {
      const [startTime, endTime] = PERIOD_TIMES[slot.slotIndex] || [null, null];
      if (!slot.assignmentId || !startTime || !endTime || !slot.assignment?.subject) return null;
      const session = await prisma.attendanceSession.findFirst({
        where: {
          assignmentId: slot.assignmentId,
          date,
          classGroup: slot.classGroup,
          startTime,
          endTime,
          semester: { status: 'ACTIVE' },
        },
        select: { id: true },
      });
      return {
        id: `timetable-${slot.id}`,
        subjectCode: slot.assignment?.subject?.code ?? null,
        subjectName: slot.assignment?.subject?.name ?? null,
        classGroup: slot.classGroup,
        startTime,
        endTime,
        room: slot.room,
        source: 'timetable' as const,
        attendanceMarked: Boolean(session),
      };
    }));

    return res.json(classes.filter(Boolean));
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return res.status(500).json({ error: 'Internal server error while fetching teacher classes' });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  const classGroup = req.user?.classGroup;

  if (!studentId || !classGroup) {
    return res.status(400).json({ error: 'Invalid student ID or class section group mapping' });
  }

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Get all assignments corresponding to the student's class group section
    const assignments = await prisma.subjectSectionAssignment.findMany({
      where: { classGroup },
      include: {
        subject: { select: { code: true, name: true, type: true } },
        theoryFaculty: { select: { name: true } },
        labFaculty: { select: { name: true } },
        attendanceSessions: {
          where: {
            semesterId: activeSem.id,
          },
          select: {
            date: true,
            records: {
              where: { studentId },
              select: { status: true },
            },
          },
        },
      },
    });

    // Map assignments into structure required by frontend
    const attendanceData = assignments.map((assign) => {
      const sessions = assign.attendanceSessions.map((session) => {
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
        name: assign.subject.name,
        code: assign.subject.code,
        faculty: assign.theoryFaculty?.name ?? assign.labFaculty?.name ?? '',
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
  const startTime = String(req.query.startTime || '');
  const endTime = String(req.query.endTime || '');
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

    // Find the assignment for this subject where the teacher is assigned (theory or lab)
    const assignment = await prisma.subjectSectionAssignment.findFirst({
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
        subject: { select: { code: true, name: true } },
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Subject section assignment not found or you are not assigned to this subject' });
    }

    const classGroup = assignment.classGroup;

    // Get all students enrolled in this subject's class section
    const students = await prisma.user.findMany({
      where: { role: 'student', classGroup },
      orderBy: { id: 'asc' },
    });

    // Get existing session attendance records if saved (for active semester)
    const session = await prisma.attendanceSession.findFirst({
      where: {
        assignmentId: assignment.id,
        date,
        classGroup,
        semesterId: activeSem.id,
        ...(startTime && endTime ? { startTime, endTime } : {}),
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
      subjectCode: assignment.subject.code,
      classGroup,
      date,
      startTime,
      endTime,
      students: studentList,
    });
  } catch (error) {
    console.error('Error fetching teacher attendance view:', error);
    return res.status(500).json({ error: 'Internal server error during attendance checklist fetch' });
  }
};

export const saveTeacherAttendance = async (req: AuthRequest, res: Response) => {
  const { subjectCode, date, classGroup, startTime, endTime, room, records } = req.body;
  const teacherId = req.user?.id;

  try {
    // Get active semester
    const activeSem = await semesterService.getActiveSemester();
    if (!activeSem) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Find the assignment for this subject and classGroup where the teacher is assigned (theory or lab)
    const assignment = await prisma.subjectSectionAssignment.findFirst({
      where: {
        subject: {
          code: subjectCode
        },
        classGroup,
        OR: [
          { theoryFacultyId: teacherId },
          { labFacultyId: teacherId }
        ]
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Subject section assignment not found or you are not assigned to this subject and classGroup' });
    }

    // Upsert the session for the given assignment, date, classGroup, and active semester
    const session = await prisma.attendanceSession.upsert({
      where: {
        assignmentId_date_classGroup_semesterId_startTime_endTime: {
          assignmentId: assignment.id,
          date,
          classGroup,
          semesterId: activeSem.id,
          startTime,
          endTime,
        },
      },
      update: { room: room || null },
      create: {
        date,
        classGroup,
        startTime,
        endTime,
        room: room || null,
        updatedAt: new Date(),
        assignment: {
          connect: { id: assignment.id }
        },
        semester: {
          connect: { id: activeSem.id }
        }
      },
    });

    // Upsert attendance records inside a transaction
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

export const getCorrectionSessions = async (req: AuthRequest, res: Response) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const subjectCode = typeof req.query.subjectCode === 'string' ? req.query.subjectCode : undefined;
  const classGroup = typeof req.query.classGroup === 'string' ? req.query.classGroup : undefined;
  const isTeacher = req.user?.role === 'teacher';

  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        ...(date ? { date } : {}),
        ...(subjectCode ? { assignment: { subject: { code: subjectCode } } } : {}),
        ...(classGroup ? { classGroup } : {}),
        ...(isTeacher ? { assignment: { OR: [{ theoryFacultyId: req.user?.id }, { labFacultyId: req.user?.id }] } } : {}),
      },
      include: {
        assignment: {
          include: {
            subject: { select: { code: true, name: true } },
          }
        },
        records: {
          include: { student: { select: { id: true, email: true, name: true } } },
          orderBy: { studentId: 'asc' },
        },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: 100,
    });

    return res.json(sessions);
  } catch (error) {
    console.error('Error fetching attendance correction sessions:', error);
    return res.status(500).json({ error: 'Internal server error while fetching attendance sessions' });
  }
};

export const updateAttendanceRecord = async (req: AuthRequest, res: Response) => {
  const { recordId } = req.params;
  const { status } = req.body;

  if (status !== 'present' && status !== 'absent') {
    return res.status(400).json({ error: 'Attendance status must be present or absent' });
  }

  try {
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: String(recordId) },
      include: {
        session: {
          include: {
            assignment: {
              include: {
                theoryFaculty: { select: { id: true } },
                labFaculty: { select: { id: true } }
              }
            }
          }
        }
      },
    });
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });

    const isTheoryFaculty = record.session?.assignment?.theoryFacultyId === req.user?.id;
    const isLabFaculty = record.session?.assignment?.labFacultyId === req.user?.id;
    const canEdit = req.user?.role !== 'teacher' || isTheoryFaculty || isLabFaculty;
    if (!canEdit) return res.status(403).json({ error: 'You can only correct attendance for your assigned subjects' });

    const updated = await prisma.attendanceRecord.update({
      where: { id: String(recordId) },
      data: { status },
    });
    return res.json(updated);
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return res.status(500).json({ error: 'Internal server error while updating attendance' });
  }
};