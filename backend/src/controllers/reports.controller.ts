import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

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
    const vergeThresholdParam = req.query.vergeThreshold;

    // Extract values (handle potential arrays from query string parsing)
    const semesterId = Array.isArray(semesterIdParam) ? semesterIdParam[0] : semesterIdParam;
    const department = Array.isArray(departmentParam) ? departmentParam[0] : departmentParam;
    const classGroup = Array.isArray(classGroupParam) ? classGroupParam[0] : classGroupParam;
    const vergeThreshold = Array.isArray(vergeThresholdParam) ? vergeThresholdParam[0] : vergeThresholdParam;

    // Parse threshold (default 13 as per specs)
    const threshold = parseInt(vergeThreshold as string) || 13;

    // Build where clause for students
    const where: any = { role: 'student' };

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

    // Role-based filtering: teachers can only see their subjects/classes
    // For now, we'll implement basic role checking - this can be enhanced based on teacher-subject relations
    if (req.user?.role === 'teacher') {
      // Teachers can only see students in their department/classGroup
      // This assumes teacher's department/classGroup is stored in their user record
      // In a more complete implementation, we'd join with taughtSubjects
      if (req.user.department) {
        where.department = req.user.department;
      }
      if (req.user.classGroup) {
        where.classGroup = req.user.classGroup;
      }
    }

    // Get active semester if none specified
    let activeSemesterId = semesterId;
    if (!activeSemesterId) {
      const activeSemester = await prisma.semester.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });
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
      // Group marks by subject
      const subjectsMap: Record<string, any[]> = {};
      student.marks.forEach((mark: any) => {
        const subjectCode = mark.subject?.code;
        if (subjectCode) {
          if (!subjectsMap[subjectCode]) {
            subjectsMap[subjectCode] = [];
          }
          subjectsMap[subjectCode].push(mark);
        }
      });

      let totalScore = 0;
      let maxTotalScore = 0;
      let isVerge = false;
      let best2CieAvg = 0;
      let scaledCie = 0;
      let theoryScaledCie = 0;
      let labTotal = 0;
      let assignmentTotal = 0;

      // Process each subject
      for (const [subjectCode, marks] of Object.entries(subjectsMap)) {
        const subject = marks[0]?.subject;
        if (!subject) continue;

        const subjectType = subject.type; // STANDALONE or INTEGRATED

        // Filter marks by type
        const ia1Mark = marks.find((m: any) => m.type === 'ia1');
        const ia2Mark = marks.find((m: any) => m.type === 'ia2');
        const ia3Mark = marks.find((m: any) => m.type === 'ia3');
        const assignmentMark = marks.find((m: any) => m.type === 'assignment');
        const labMark = marks.find((m: any) => m.type === 'lab');

        let cieScores: number[] = [];
        if (ia1Mark?.score != null) cieScores.push(ia1Mark.score);
        if (ia2Mark?.score != null) cieScores.push(ia2Mark.score);
        if (ia3Mark?.score != null) cieScores.push(ia3Mark.score);

        // Calculate best 2 CIE average
        if (cieScores.length >= 2) {
          // Sort descending and take top 2
          const sorted = [...cieScores].sort((a, b) => b - a);
          best2CieAvg = (sorted[0] + sorted[1]) / 2;
        } else if (cieScores.length === 1) {
          // Only one CIE available
          best2CieAvg = cieScores[0];
        }
        // If no CIEs, best2CieAvg remains 0 (already initialized)

        if (subjectType === 'STANDALONE') {
          // For standalone: CIE max 25, Assignment max 25
          // Scale best 2 CIE average (out of 50) down to out of 25
          scaledCie = (best2CieAvg / 50) * 25;

          // Assignment score (out of 25)
          assignmentTotal = assignmentMark?.score ?? 0;

          // Total score for subject (CIE + Assignment)
          totalScore += scaledCie + assignmentTotal;
          maxTotalScore += 50; // 25 + 25

          // Verge check: Scaled CIE < threshold
          if (scaledCie < threshold) {
            isVerge = true;
          }
        } else if (subjectType === 'INTEGRATED') {
          // For integrated: Theory (CIE max 15, Assignment max 10) + Lab max 25

          // Theory CIE: scale best 2 average (out of 50) to out of 15
          theoryScaledCie = (best2CieAvg / 50) * 15;

          // Theory Assignment: out of 10
          assignmentTotal = (assignmentMark?.score ?? 0) * (10 / 25); // Assignments are marked out of 25, scale to 10

          // Lab: out of 25
          labTotal = labMark?.score ?? 0;

          // Total score for subject
          totalScore += theoryScaledCie + assignmentTotal + labTotal;
          maxTotalScore += 50; // 15 + 10 + 25

          // Verge check: Theory Scaled CIE < threshold OR Lab Total < 12
          if (theoryScaledCie < threshold || labTotal < 12) {
            isVerge = true;
          }
        }
      }

      // Count backlogs from user field (if available)
      const backlogCount = student.numberOfBacklogs || 0;

      return {
        id: student.id,
        name: student.name,
        department: student.department,
        classGroup: student.classGroup,
        numberOfBacklogs: backlogCount,
        best2CieAvg: parseFloat(best2CieAvg.toFixed(2)),
        cieScaled: parseFloat(scaledCie.toFixed(2)),
        assignmentTotal: parseFloat(assignmentTotal.toFixed(2)),
        labTotal: parseFloat(labTotal.toFixed(2)),
        totalScore: parseFloat(totalScore.toFixed(2)),
        maxTotalScore,
        vergeStatus: isVerge ? 'AT_RISK' : 'SAFE',
        assign1Submitted: false, // Placeholder - would need to check specific assignments
        assign2Submitted: false  // Placeholder - would need to check specific assignments
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
      where: { id: studentId },
      data: dataToUpdate
    });

    return res.status(200).json({ success: true, user: { id: updatedUser.id, numberOfBacklogs: updatedUser.numberOfBacklogs } });
  } catch (error) {
    console.error('Error updating backlogs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
