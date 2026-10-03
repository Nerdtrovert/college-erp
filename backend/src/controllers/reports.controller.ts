import { Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { semesterService } from '../services/SemesterService';
import { isSubjectAtRisk } from '../utils/academicRisk';
import { calculateProjectedSgpa } from '../utils/projectedSgpa';

const getStudentReportWhere = (
  semesterId: string,
  program?: string,
  classGroup?: string,
  teacherClassGroups?: string[],
  semesterNumber?: number,
): Prisma.UserWhereInput => {
  if (teacherClassGroups && teacherClassGroups.length === 0) {
    return { id: { in: [] } };
  }

  if (classGroup && teacherClassGroups && !teacherClassGroups.includes(classGroup)) {
    return { id: { in: [] } };
  }

  const scopedClassGroup = classGroup || (teacherClassGroups ? { in: teacherClassGroups } : undefined);
  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput = {
    semesterId,
    ...(semesterNumber !== undefined ? { semesterNumber } : {}),
    ...(program ? { program } : {}),
    ...(scopedClassGroup ? { classGroup: scopedClassGroup } : {}),
  };
  const legacyStudentWhere: Prisma.UserWhereInput = {
    semesterId,
    ...(program ? { program } : {}),
    ...(classGroup ? { classGroup } : {}),
    ...(!classGroup && teacherClassGroups ? { classGroup: { in: teacherClassGroups } } : {}),
  };

  return {
    role: 'student',
    OR: [
      { enrollments: { some: enrollmentWhere } },
      ...(semesterNumber === undefined ? [{
        AND: [
          { enrollments: { none: { semesterId } } },
          legacyStudentWhere,
        ],
      }] : []),
    ],
  };
};

const getSemesterEnrollment = (student: any, semesterId: string) =>
  student.enrollments?.find((enrollment: any) => enrollment.semesterId === semesterId);

const getReportStudentDetails = (student: any, semesterId: string) => {
  const enrollment = getSemesterEnrollment(student, semesterId);
  return {
    program: enrollment?.program ?? student.program,
    classGroup: enrollment?.classGroup ?? student.classGroup,
    semester: enrollment?.semester ?? student.semester,
    currentSemester: enrollment?.semesterNumber,
  };
};

/**
 * Get verge of backlog report for students
 * Returns students who are at risk of having backlogs based on CIE scores
 */
export const getVergeOfBacklogReport = async (req: AuthRequest, res: Response) => {
  try {
    // Get query parameters for filtering - handle arrays from query parsing
    const semesterIdParam = req.query.semesterId;
    const programParam = req.query.program;
    const classGroupParam = req.query.classGroup;
    const semesterNumberParam = req.query.semesterNumber;
    const hasBacklogsParam = req.query.hasBacklogs;
    const atRiskOnlyParam = req.query.atRiskOnly;

    // Extract values (handle potential arrays from query string parsing)
    const semesterId = typeof semesterIdParam === 'string'
      ? semesterIdParam
      : Array.isArray(semesterIdParam) && typeof semesterIdParam[0] === 'string'
        ? semesterIdParam[0]
        : undefined;
    const program = typeof programParam === 'string'
      ? programParam
      : Array.isArray(programParam) && typeof programParam[0] === 'string'
        ? programParam[0]
        : undefined;
    const classGroup = typeof classGroupParam === 'string'
      ? classGroupParam
      : Array.isArray(classGroupParam) && typeof classGroupParam[0] === 'string'
        ? classGroupParam[0]
        : undefined;
    const semesterNumber = typeof semesterNumberParam === 'string' && /^\d+$/.test(semesterNumberParam)
      ? Number(semesterNumberParam)
      : undefined;
    const hasBacklogs = typeof hasBacklogsParam === 'string'
      ? hasBacklogsParam
      : Array.isArray(hasBacklogsParam) && typeof hasBacklogsParam[0] === 'string'
        ? hasBacklogsParam[0]
        : undefined;
    const atRiskOnly = atRiskOnlyParam === 'true' || atRiskOnlyParam === '1';

    // Role-based scoping
    let teacherClassGroups: string[] | undefined;
    if (req.user?.role === 'teacher') {
      // Teachers can only see students in the classes they teach
      const taughtSubjects = await prisma.subject.findMany({
        where: { OR: [{ facultyId: req.user.id }, { coFacultyId: req.user.id }] },
        select: { classGroup: true }
      });
      teacherClassGroups = Array.from(new Set(taughtSubjects.map(s => s.classGroup)));
    }

    // Get active semester if none specified
    let activeSemesterId = semesterId;
    if (!activeSemesterId) {
      const activeSemester = await semesterService.getActiveSemester();
      activeSemesterId = activeSemester?.id;
    }

    if (!activeSemesterId) {
      return res.status(400).json({ error: 'No active semester found and none specified' });
    }

    const where: Prisma.UserWhereInput = {
      ...getStudentReportWhere(
        activeSemesterId,
        program || undefined,
        classGroup || undefined,
        teacherClassGroups,
        semesterNumber,
      ),
      ...(hasBacklogs === 'yes' ? { numberOfBacklogs: { gt: 0 } } : {}),
      ...(hasBacklogs === 'no' ? { numberOfBacklogs: 0 } : {}),
    };

    // Fetch students with their marks for the semester
    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        program: true,
        classGroup: true,
        semesterId: true,
        semester: { select: { id: true, name: true } },
        enrollments: {
          where: { semesterId: activeSemesterId },
          select: {
            semesterNumber: true,
            semesterId: true,
            program: true,
            classGroup: true,
            semester: { select: { id: true, name: true } },
          },
        },
        numberOfBacklogs: true,
        backlogSubjects: true,
        marks: {
          where: {
            semesterId: activeSemesterId
          },
          select: {
            type: true,
            score: true,
            maxScore: true,
            subject: {
              select: {
                code: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    });

    const studentClassGroups = Array.from(new Set(students.map((student) =>
      getReportStudentDetails(student, activeSemesterId).classGroup,
    ).filter((classGroup): classGroup is string => Boolean(classGroup))));
    const subjects = studentClassGroups.length > 0
      ? await prisma.subject.findMany({
        where: { classGroup: { in: studentClassGroups } },
        select: { code: true, name: true, type: true, classGroup: true },
      })
      : [];

    // Process each student to calculate verge of backlog status
    const report = students.map(student => {
      const subjectsMap: Record<string, any[]> = {};
      
      student.marks.forEach((mark: any) => {
        if (!mark.subject) return;
        const code = mark.subject.code;
        if (!subjectsMap[code]) {
          subjectsMap[code] = [];
        }
        subjectsMap[code].push(mark);
      });

      let isVerge = false;
      let totalScoreAll = 0;
      const subjectsDetail: any[] = [];
      const atRiskSubjects: string[] = [];
      const studentDetails = getReportStudentDetails(student, activeSemesterId);
      const studentSubjects = subjects.filter((subject) => subject.classGroup === studentDetails.classGroup);

      for (const subject of studentSubjects) {
        const subjectCode = subject.code;
        const marks = subjectsMap[subjectCode] || [];

        const subjectType = subject.type; // STANDALONE or INTEGRATED
        const subjectName = subject.name;

        const cie1Mark = marks.find((m: any) => m.type === 'cie1')?.score ?? null;
        const cie2Mark = marks.find((m: any) => m.type === 'cie2')?.score ?? null;
        const cie3Mark = marks.find((m: any) => m.type === 'cie3')?.score ?? null;
        const assignmentMark = marks.find((m: any) => m.type === 'assignment')?.score ?? null;
        const labMark = marks.find((m: any) => m.type === 'lab')?.score ?? null;

        let cieScores: number[] = [];
        if (cie1Mark != null) cieScores.push(cie1Mark);
        if (cie2Mark != null) cieScores.push(cie2Mark);
        if (cie3Mark != null) cieScores.push(cie3Mark);

        let best2CieAvg = 0;
        if (cieScores.length >= 2) {
          const sorted = [...cieScores].sort((a, b) => b - a);
          best2CieAvg = (sorted[0] + sorted[1]) / 2;
        } else if (cieScores.length === 1) {
          best2CieAvg = cieScores[0];
        }

        let subjectVerge = false;
        let subjectTotal = 0;

        if (subjectType === 'STANDALONE') {
          const scaledCie = best2CieAvg * (50 / 30);
          subjectTotal = scaledCie;
        } else if (subjectType === 'INTEGRATED') {
          const theoryScaledCie = best2CieAvg * (15 / 30);
          const assignmentTotal = (assignmentMark ?? 0) * (10 / 25);
          const labTotal = labMark ?? 0;
          subjectTotal = theoryScaledCie + assignmentTotal + labTotal;
        }
        subjectVerge = isSubjectAtRisk(
          subjectType,
          cieScores.length > 0 ? best2CieAvg : null,
          labMark,
        );

        totalScoreAll += subjectTotal;
        if (subjectVerge) {
          isVerge = true;
          atRiskSubjects.push(subjectCode);
        }

        subjectsDetail.push({
          subjectCode,
          subjectName,
          cie1: cie1Mark,
          cie1MaxScore: marks.find((m: any) => m.type === 'cie1')?.maxScore ?? null,
          cie2: cie2Mark,
          cie2MaxScore: marks.find((m: any) => m.type === 'cie2')?.maxScore ?? null,
          cie3: cie3Mark,
          assignment: assignmentMark,
          lab: labMark,
          total: parseFloat(subjectTotal.toFixed(2)),
          isVerge: subjectVerge
        });
      }

      return {
        id: student.id,
        name: student.name,
        ...studentDetails,
        numberOfBacklogs: student.numberOfBacklogs || 0,
        backlogSubjects: student.backlogSubjects || '',
        totalScore: parseFloat(totalScoreAll.toFixed(2)),
        vergeStatus: isVerge ? 'AT_RISK' : 'SAFE',
        atRiskSubjects,
        projectedSgpa: calculateProjectedSgpa(studentSubjects.map((subject) => ({
          type: subject.type,
          marks: subjectsMap[subject.code] || [],
        }))),
        subjects: subjectsDetail
      };
    });

    return res.status(200).json(
      atRiskOnly
        ? report.filter(student => student.vergeStatus === 'AT_RISK' && student.atRiskSubjects.length > 0)
        : report,
    );
  } catch (error) {
    console.error('Error generating verge of backlog report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
/**
 * Update student backlogs
 */
export const updateBacklogs = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    const { numberOfBacklogs, backlogSubjects } = req.body;

    const dataToUpdate: any = {};
    if (numberOfBacklogs !== undefined) {
      dataToUpdate.numberOfBacklogs = parseInt(numberOfBacklogs as any);
    }
    if (backlogSubjects !== undefined && Array.isArray(backlogSubjects)) {
      dataToUpdate.backlogSubjects = backlogSubjects;
    }

    const updatedUser = await prisma.user.update({
      where: { id: studentId as string },
      data: dataToUpdate
    });

    return res.status(200).json({ success: true, user: { id: updatedUser.id, numberOfBacklogs: updatedUser.numberOfBacklogs } });
  } catch (error) {
    console.error('Error updating backlogs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAttendanceAndAssignmentReport = async (req: AuthRequest, res: Response) => {
  const reportType = req.query.type === 'missing_assignments' ? 'missing_assignments' : 'low_attendance';
  const threshold = Math.max(0, Math.min(100, Number(req.query.threshold) || 75));
  const semesterId = typeof req.query.semesterId === 'string'
    ? req.query.semesterId
    : (await semesterService.getActiveSemester())?.id;
  const program = typeof req.query.program === 'string' ? req.query.program : undefined;
  const classGroup = typeof req.query.classGroup === 'string' ? req.query.classGroup : undefined;
  const semesterNumber = typeof req.query.semesterNumber === 'string' && /^\d+$/.test(req.query.semesterNumber)
    ? Number(req.query.semesterNumber)
    : undefined;

  if (!semesterId) return res.status(400).json({ error: 'No active semester found and none specified' });

  try {
    let teacherClassGroups: string[] | undefined;
    if (req.user?.role === 'teacher') {
      const taught = await prisma.subject.findMany({
        where: { OR: [{ facultyId: req.user.id }, { coFacultyId: req.user.id }] },
        select: { classGroup: true },
      });
      teacherClassGroups = Array.from(new Set(taught.map((item) => item.classGroup)));
    }

    const students = await prisma.user.findMany({
      where: getStudentReportWhere(semesterId, program, classGroup, teacherClassGroups, semesterNumber),
      select: {
        id: true,
        name: true,
        program: true,
        classGroup: true,
        semesterId: true,
        semester: { select: { id: true, name: true } },
        enrollments: {
          where: { semesterId },
          select: {
            semesterId: true,
            semesterNumber: true,
            program: true,
            classGroup: true,
            semester: { select: { id: true, name: true } },
          },
        },
        marks: {
          where: { semesterId },
          select: {
            subjectCode: true,
            type: true,
            score: true,
            assign1Submitted: true,
            assign2Submitted: true,
            subject: { select: { code: true, name: true, classGroup: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (reportType === 'missing_assignments') {
      const subjects = await prisma.subject.findMany({
        where: {
          ...(classGroup ? { classGroup } : {}),
          ...(req.user?.role === 'teacher' ? { OR: [{ facultyId: req.user.id }, { coFacultyId: req.user.id }] } : {}),
        },
        select: { code: true, name: true, classGroup: true, type: true },
      });
      const report = students.flatMap((student) => {
        const studentDetails = getReportStudentDetails(student, semesterId);
        return subjects
          .filter((subject) => subject.classGroup === studentDetails.classGroup)
          .flatMap((subject) => {
            const assignmentMarks = student.marks.filter((mark) =>
              mark.subjectCode === subject.code && ['assignment', 'assignment1', 'assignment2'].includes(mark.type)
            );
            const assignment1 = assignmentMarks.find((mark) => mark.type === 'assignment' || mark.type === 'assignment1');
            const assignment2 = assignmentMarks.find((mark) => mark.type === 'assignment2');
            const missingAssignment1 = !assignment1 || assignment1.score === null;
            const missingAssignment2 = subject.type === 'INTEGRATED' && (!assignment2 || assignment2.score === null);
            return (missingAssignment1 || missingAssignment2) ? [{
            studentId: student.id,
            studentName: student.name,
            ...studentDetails,
            subjectCode: subject.code,
            subjectName: subject.name,
            missingAssignment1,
            missingAssignment2,
            score: assignment1?.score ?? null,
          }] : [];
          });
      });
      return res.json(report);
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: { semesterId, ...(classGroup ? { classGroup } : {}) },
      select: {
        classGroup: true,
        subjectCode: true,
        subject: { select: { name: true, facultyId: true, coFacultyId: true } },
        records: { select: { studentId: true, status: true } },
      },
    });
    const taughtCodes = req.user?.role === 'teacher'
      ? new Set((await prisma.subject.findMany({ where: { OR: [{ facultyId: req.user.id }, { coFacultyId: req.user.id }] }, select: { code: true } })).map((s) => s.code))
      : null;
    const scopedSessions = taughtCodes
      ? sessions.filter((session) => taughtCodes.has(session.subjectCode))
      : sessions;
    const totals = new Map<string, { present: number; total: number; subjects: Map<string, { present: number; total: number; name: string }> }>();
    scopedSessions.forEach((session) => session.records.forEach((record) => {
      const current = totals.get(record.studentId) || { present: 0, total: 0, subjects: new Map() };
      current.total += 1;
      if (record.status === 'present') current.present += 1;
      const subject = current.subjects.get(session.subjectCode) || { present: 0, total: 0, name: session.subject.name };
      subject.total += 1;
      if (record.status === 'present') subject.present += 1;
      current.subjects.set(session.subjectCode, subject);
      totals.set(record.studentId, current);
    }));
    const report = students.flatMap((student) => {
      const total = totals.get(student.id);
      if (!total) return [];
      const percentage = Math.round((total.present / total.total) * 100);
      if (percentage >= threshold) return [];
      const studentDetails = getReportStudentDetails(student, semesterId);
      return Array.from(total.subjects.entries()).map(([subjectCode, subject]) => ({
        studentId: student.id,
        studentName: student.name,
        ...studentDetails,
        subjectCode,
        subjectName: subject.name,
        present: subject.present,
        total: subject.total,
        percentage: Math.round((subject.present / subject.total) * 100),
        overallPresent: total.present,
        overallTotal: total.total,
        overallPercentage: percentage,
      }));
    });
    return res.json(report);
  } catch (error) {
    console.error('Error generating attendance/assignment report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
