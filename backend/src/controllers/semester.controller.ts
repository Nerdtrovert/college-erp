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
  const { code, name, startDate, endDate, status } = req.body;
  try {
    const semester = await prisma.semester.create({
      data: {
        code,
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
  const { code, name, startDate, endDate, status } = req.body; // new semester data
  const tx = await prisma.$transaction(async (prisma) => {
    // 1. create new semester
    const newSem = await prisma.semester.create({
      data: {
        code,
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
      // Skip sessions without assignmentId
      if (sess.assignmentId === null) {
        continue;
      }

      // Get the assignment directly from the session's assignmentId
      const assignment = await prisma.subjectSectionAssignment.findUnique({
        where: { id: sess.assignmentId },
        include: { subject: true }
      });

      if (!assignment) {
        throw new Error(`No assignment found for id ${sess.assignmentId}`);
      }

      // Verify that the assignment's classGroup matches the session's classGroup for data consistency
      if (assignment.classGroup !== sess.classGroup) {
        throw new Error(`Assignment classGroup (${assignment.classGroup}) does not match session classGroup (${sess.classGroup}) for assignment id ${sess.assignmentId}`);
      }

      const newSess = await prisma.attendanceSession.create({
        data: {
          assignmentId: assignment.id,
          date: sess.date,
          classGroup: sess.classGroup,
          semesterId: newSem.id,
          startTime: sess.startTime,
          endTime: sess.endTime,
          room: sess.room,
          updatedAt: new Date(),
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
      // For marks, we don't have classGroup, so we need to get it from the student's enrollment
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          studentId: m.studentId,
          semesterId: sourceSemesterId
        }
      });

      if (!enrollment) {
        throw new Error(`No enrollment found for student ${m.studentId} in semester ${sourceSemesterId}`);
      }

      // Skip marks without assignmentId
      if (m.assignmentId === null) {
        continue;
      }

      // Get the assignment directly from the mark's assignmentId
      const assignment = await prisma.subjectSectionAssignment.findUnique({
        where: { id: m.assignmentId },
        include: { subject: true }
      });

      if (!assignment) {
        throw new Error(`No assignment found for id ${m.assignmentId}`);
      }

      // Verify that the assignment's classGroup matches the student's enrollment classGroup
      if (assignment.classGroup !== enrollment.classGroup) {
        throw new Error(`Assignment classGroup (${assignment.classGroup}) does not match enrollment classGroup (${enrollment.classGroup}) for mark ${m.id}`);
      }

      await prisma.mark.create({
        data: {
          studentId: m.studentId,
          assignmentId: assignment.id,
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
      // Skip timetable slots without an assignment
      if (!s.assignmentId) {
        continue;
      }

      // Get the assignment directly from the timetable slot's assignmentId
      const assignment = await prisma.subjectSectionAssignment.findUnique({
        where: { id: s.assignmentId },
        include: { subject: true }
      });

      if (!assignment) {
        throw new Error(`No assignment found for id ${s.assignmentId}`);
      }

      // Determine the batch year for this new semester and class group
      const batchYearRecord = await prisma.studentEnrollment.findFirst({
        where: {
          semesterId: newSem.id,
          classGroup: s.classGroup
        },
        select: {
          student: {
            select: {
              batchStartYear: true
            }
          }
        }
      });

      const batchYear = batchYearRecord?.student?.batchStartYear ?? null;

      await prisma.timetableSlot.create({
        data: {
          day: s.day,
          slotIndex: s.slotIndex,
          assignmentId: assignment.id,
          room: s.room,
          classGroup: s.classGroup,
          teacherId: s.teacherId,
          semesterId: newSem.id,
          batchYear: batchYear
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

// NEW ENDPOINTS FOR TIMETABLE MANAGEMENT CASCADING SELECTORS
export const getStudentSemestersForSemester = async (req: AuthRequest, res: Response) => {
  let { semesterId } = req.params;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];

  if (!semesterId) {
    return res.status(400).json({ error: 'Semester ID is required' });
  }

  try {
    // Get distinct student semester numbers for the given semester
    const studentSemesters = await prisma.studentEnrollment.findMany({
      where: { semesterId },
      select: { semesterNumber: true },
      distinct: ['semesterNumber'],
      orderBy: { semesterNumber: 'asc' },
    });

    // Format as array of objects with id and name for frontend compatibility
    const formatted = studentSemesters.map(ss => ({
      id: ss.semesterNumber.toString(),
      name: `${ss.semesterNumber}${getOrdinalSuffix(ss.semesterNumber)} Semester`
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching student semesters for semester:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProgramsForSemesterAndStudentSemester = async (req: AuthRequest, res: Response) => {
  let { semesterId, studentSemesterId } = req.params;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];
  if (Array.isArray(studentSemesterId)) studentSemesterId = studentSemesterId[0];


  try {
    const semesterNumber = parseInt(studentSemesterId, 10);
    if (isNaN(semesterNumber)) {
      return res.status(400).json({ error: 'Invalid student semester number' });
    }

    // Get distinct programs for the given semester and student semester number
    const programs = await prisma.studentEnrollment.findMany({
      where: {
        semesterId,
        semesterNumber
      },
      select: { program: true },
      distinct: ['program'],
      orderBy: { program: 'asc' },
    });

    // Format as array of strings for frontend compatibility
    const formatted = programs.map(p => p.program);

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching programs for semester and student semester:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSectionsForSemesterStudentSemesterAndProgram = async (req: AuthRequest, res: Response) => {
  let { semesterId, studentSemesterId, program } = req.params;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];
  if (Array.isArray(studentSemesterId)) studentSemesterId = studentSemesterId[0];
  if (Array.isArray(program)) program = program[0];

  if (!semesterId || !studentSemesterId || !program) {
    return res.status(400).json({ error: 'Semester ID, Student Semester ID, and Program are required' });
  }

  try {
    const semesterNumber = parseInt(studentSemesterId, 10);
    if (isNaN(semesterNumber)) {
      return res.status(400).json({ error: 'Invalid student semester number' });
    }

    // Get distinct classGroups (sections) for the given semester, student semester number, and program
    const sections = await prisma.studentEnrollment.findMany({
      where: {
        semesterId,
        semesterNumber,
        program
      },
      select: { classGroup: true },
      distinct: ['classGroup'],
      orderBy: { classGroup: 'asc' },
    });

    // Format as array of strings for frontend compatibility
    const formatted = sections.map(s => s.classGroup);

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching sections for semester, student semester, and program:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
