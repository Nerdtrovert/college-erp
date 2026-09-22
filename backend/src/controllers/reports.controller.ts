import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { semesterService } from '../services/SemesterService';

/**
 * Get verge of backlog report for students
 * Returns students who are at risk of having backlogs based on CIE scores
 */
export const getVergeOfBacklogReport = async (req: AuthRequest, res: Response) => {
  try {
    // Get query parameters for filtering - handle arrays from query parsing
    const semesterIdParam = req.query.semesterId;
    const departmentParam = req.query.department;
    const classGroupParam = req.query.classGroup;
    const hasBacklogsParam = req.query.hasBacklogs;

    // Extract values (handle potential arrays from query string parsing)
    const semesterId = Array.isArray(semesterIdParam) ? semesterIdParam[0] : semesterIdParam;
    const department = Array.isArray(departmentParam) ? departmentParam[0] : departmentParam;
    const classGroup = Array.isArray(classGroupParam) ? classGroupParam[0] : classGroupParam;
    const hasBacklogs = Array.isArray(hasBacklogsParam) ? hasBacklogsParam[0] : hasBacklogsParam;

    // Parse threshold (default 13 as per specs)
    const threshold = 13;

    // Build where clause for students
    const where: any = { role: 'student' };
    
    if (hasBacklogs === 'yes') {
      where.numberOfBacklogs = { gt: 0 };
    } else if (hasBacklogs === 'no') {
      where.numberOfBacklogs = 0;
    }

    // Add semester filter if provided
    if (semesterId && typeof semesterId === 'string') {
      where.semesterId = semesterId;
    }

    // Add department filter if provided
    if (department && typeof department === 'string' && department !== '') {
      where.department = department;
    }

    // Add classGroup filter if provided
    if (classGroup && typeof classGroup === 'string' && classGroup !== '') {
      where.classGroup = classGroup;
    }

    // Role-based scoping
    if (req.user?.role === 'teacher') {
      // Teachers can only see students in the classes they teach
      const taughtSubjects = await prisma.subject.findMany({
        where: { facultyId: req.user.id },
        select: { classGroup: true }
      });
      const teacherClassGroups = Array.from(new Set(taughtSubjects.map(s => s.classGroup)));
      
      if (teacherClassGroups.length > 0) {
        if (where.classGroup) {
          // If teacher specified a filter, ensure it's one they teach
          if (!teacherClassGroups.includes(where.classGroup)) {
            where.id = 'UNAUTHORIZED_CLASS';
          }
        } else {
          where.classGroup = { in: teacherClassGroups };
        }
      } else {
        // Teacher has no classes, return empty results by matching an impossible condition
        where.id = 'NO_CLASSES_ASSIGNED';
      }
    } else if (req.user?.role === 'hod') {
      // HODs can only see students in their own department
      if (req.user.department) {
        where.department = req.user.department;
      }
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

    // Fetch students with their marks for the semester
    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        department: true,
        classGroup: true,
        semesterId: true,
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

      for (const [subjectCode, marks] of Object.entries(subjectsMap)) {
        const subject = marks[0]?.subject;
        if (!subject) continue;

        const subjectType = subject.type; // STANDALONE or INTEGRATED
        const subjectName = subject.name;

        const ia1Mark = marks.find((m: any) => m.type === 'ia1')?.score ?? null;
        const ia2Mark = marks.find((m: any) => m.type === 'ia2')?.score ?? null;
        const ia3Mark = marks.find((m: any) => m.type === 'ia3')?.score ?? null;
        const assignmentMark = marks.find((m: any) => m.type === 'assignment')?.score ?? null;
        const labMark = marks.find((m: any) => m.type === 'lab')?.score ?? null;

        let cieScores: number[] = [];
        if (ia1Mark != null) cieScores.push(ia1Mark);
        if (ia2Mark != null) cieScores.push(ia2Mark);
        if (ia3Mark != null) cieScores.push(ia3Mark);

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
          if (scaledCie < threshold) {
            subjectVerge = true;
          }
        } else if (subjectType === 'INTEGRATED') {
          const theoryScaledCie = best2CieAvg * (15 / 30);
          const assignmentTotal = (assignmentMark ?? 0) * (10 / 25);
          const labTotal = labMark ?? 0;
          subjectTotal = theoryScaledCie + assignmentTotal + labTotal;
          
          if (theoryScaledCie < threshold || labTotal < 12) {
            subjectVerge = true;
          }
        }

        totalScoreAll += subjectTotal;
        if (subjectVerge) {
          isVerge = true;
          atRiskSubjects.push(subjectCode);
        }

        subjectsDetail.push({
          subjectCode,
          subjectName,
          ia1: ia1Mark,
          ia2: ia2Mark,
          ia3: ia3Mark,
          assignment: assignmentMark,
          lab: labMark,
          total: parseFloat(subjectTotal.toFixed(2)),
          isVerge: subjectVerge
        });
      }

      return {
        id: student.id,
        name: student.name,
        department: student.department,
        classGroup: student.classGroup,
        numberOfBacklogs: student.numberOfBacklogs || 0,
        backlogSubjects: student.backlogSubjects || '',
        totalScore: parseFloat(totalScoreAll.toFixed(2)),
        vergeStatus: isVerge ? 'AT_RISK' : 'SAFE',
        atRiskSubjects,
        subjects: subjectsDetail
      };
    });

    return res.status(200).json(report);
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
