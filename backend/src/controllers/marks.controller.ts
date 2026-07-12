import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

export const getStudentMarks = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  const classGroup = req.user?.classGroup;

  if (!studentId || !classGroup) {
    return res.status(400).json({ error: 'Invalid credentials or missing class section group context' });
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

    // Find all subjects for this student's class group in the active semester
    const subjects = await prisma.subject.findMany({
      where: { classGroup },
      include: {
        faculty: { select: { name: true } },
        marks: {
          where: {
            studentId,
            semesterId: activeSem.id,
          },
        },
      },
    });

    // Map into the format expected by StudentMarks.tsx
    const marksData = subjects.map((sub) => {
      const ia1 = sub.marks.find((m) => m.type === 'ia1');
      const ia2 = sub.marks.find((m) => m.type === 'ia2');
      const assignment = sub.marks.find((m) => m.type === 'assignment');
      const lab = sub.marks.find((m) => m.type === 'lab');

      return {
        name: sub.name,
        code: sub.code,
        faculty: sub.faculty.name,
        assessments: [
          { name: 'IA-1', marks: ia1 ? ia1.score : null, max: ia1 ? ia1.maxScore : 30 },
          { name: 'IA-2', marks: ia2 ? ia2.score : null, max: ia2 ? ia2.maxScore : 30 },
          { name: 'Assignment', marks: assignment ? assignment.score : null, max: assignment ? assignment.maxScore : 10 },
          { name: 'Lab', marks: lab ? lab.score : null, max: lab ? lab.maxScore : 25 },
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

    // Get all students inside this class group section
    const students = await prisma.user.findMany({
      where: { role: 'student', classGroup: subject.classGroup },
      orderBy: { id: 'asc' },
    });

    // Get marks records matching the subject, type, student, and active semester
    const marks = await prisma.mark.findMany({
      where: {
        subjectCode,
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

    return res.status(200).json({
      subjectCode,
      classGroup: subject.classGroup,
      assessmentType,
      students: studentMarksList,
    });
  } catch (error) {
    console.error('Error fetching teacher marks registry view:', error);
    return res.status(500).json({ error: 'Internal server error during marks repository fetch' });
  }
};

export const saveTeacherMarks = async (req: AuthRequest, res: Response) => {
  const { subjectCode, type, maxScore, records } = req.body;

  try {
    // Verify subject exists
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

    // Bulk upsert using transaction
    await prisma.$transaction(
      records.map((rec: { studentId: string; score: number | null }) =>
        prisma.mark.upsert({
          where: {
            studentId_subjectCode_type_semesterId: {
              studentId: rec.studentId,
              subjectCode,
              type,
              semesterId: activeSem.id,
            },
          },
          update: {
            score: rec.score,
            maxScore,
          },
          create: {
            studentId: rec.studentId,
            subjectCode,
            type,
            score: rec.score,
            maxScore,
            semesterId: activeSem.id,
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