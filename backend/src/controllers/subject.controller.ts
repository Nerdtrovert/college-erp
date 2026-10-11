import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';
import { programFromLegacyDepartment } from '../constants/program';

const isElectronicsHod = (req: AuthRequest) =>
  req.user?.role === 'hod' && programFromLegacyDepartment(req.user.department) === 'ECE';

const isElectronicsClassGroup = (classGroup: string) => {
  const normalized = classGroup.trim().toUpperCase();
  return normalized === 'EC' || normalized === 'ECE' || normalized.startsWith('EC-') || normalized.startsWith('ECE-');
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: isElectronicsHod(req)
        ? {
            assignments: {
              some: {
                OR: [
                  { classGroup: { in: ['EC', 'ECE'], mode: 'insensitive' } },
                  { classGroup: { startsWith: 'EC-', mode: 'insensitive' } },
                  { classGroup: { startsWith: 'ECE-', mode: 'insensitive' } },
                ],
              },
            },
          }
        : undefined,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        courseType: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
    return res.status(200).json(subjects);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching subjects:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  const { code, name, classGroup, theoryFacultyId, labFacultyId, type } = req.body;

  if (!code || !name || !classGroup || !theoryFacultyId || !type) {
    return res.status(400).json({ error: 'Code, name, class group, theory faculty, and type are required' });
  }

  if (isElectronicsHod(req) && !isElectronicsClassGroup(String(classGroup))) {
    return res.status(403).json({ error: 'EC HODs can only create subjects for EC/ECE sections' });
  }

  try {
    // Check if subject code already exists
    const existing = await prisma.subject.findUnique({
      where: { code },
    });
    if (existing) {
      return res.status(400).json({ error: 'Subject with this code already exists' });
    }

    // Verify theory faculty exists and is a teacher
    const theoryFaculty = await prisma.user.findUnique({
      where: { id: theoryFacultyId },
    });
    if (!theoryFaculty || theoryFaculty.role !== 'teacher') {
      return res.status(400).json({ error: 'Selected theory faculty member must be a teacher' });
    }
    if (
      isElectronicsHod(req) &&
      programFromLegacyDepartment(theoryFaculty.department) !== 'ECE'
    ) {
      return res.status(403).json({ error: 'EC HODs can only assign EC/ECE faculty to subjects' });
    }

    // Verify lab faculty if provided
    if (labFacultyId) {
      const labFaculty = await prisma.user.findUnique({
        where: { id: labFacultyId },
      });
      if (!labFaculty || labFaculty.role !== 'teacher') {
        return res.status(400).json({ error: 'Selected lab faculty member must be a teacher' });
      }
      if (isElectronicsHod(req) && programFromLegacyDepartment(labFaculty.department) !== 'ECE') {
        return res.status(403).json({ error: 'EC HODs can only assign EC/ECE faculty to subjects' });
      }
    }

    // Start a transaction to create subject and assignment
    const result = await prisma.$transaction(async (tx) => {
      // Create the subject
      const subject = await tx.subject.create({
        data: {
          code,
          name,
          type,
          description: undefined, // optional
        },
      });

      // Create the section assignment
      const assignment = await tx.subjectSectionAssignment.create({
        data: {
          subjectId: subject.id,
          classGroup,
          theoryFacultyId,
          labFacultyId: labFacultyId || null,
        },
      });

      return { subject, assignment };
    });

    return res.status(201).json({
      subject: result.subject,
      assignment: result.assignment,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error creating subject:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  const code = req.params.code as string;
  const { name, type, classGroup, theoryFacultyId, labFacultyId } = req.body;

  try {
    if (isElectronicsHod(req)) {
      if (classGroup !== undefined && !isElectronicsClassGroup(String(classGroup))) {
        return res.status(403).json({ error: 'EC HODs can only update subjects for EC/ECE sections' });
      }

      const existingSubject = await prisma.subject.findUnique({
        where: { code },
        select: { assignments: { select: { classGroup: true } } },
      });
      if (
        !existingSubject ||
        existingSubject.assignments.length === 0 ||
        existingSubject.assignments.some((assignment) => !isElectronicsClassGroup(assignment.classGroup))
      ) {
        return res.status(403).json({ error: 'EC HODs can only edit EC/ECE subjects' });
      }

      const facultyIds = [...new Set([theoryFacultyId, labFacultyId].filter(
        (facultyId): facultyId is string => typeof facultyId === 'string' && facultyId.length > 0,
      ))];
      if (facultyIds.length > 0) {
        const faculty = await prisma.user.findMany({
          where: { id: { in: facultyIds } },
          select: { department: true },
        });
        if (faculty.length !== facultyIds.length || faculty.some((member) => programFromLegacyDepartment(member.department) !== 'ECE')) {
          return res.status(403).json({ error: 'EC HODs can only assign EC/ECE faculty to subjects' });
        }
      }
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the subject's name and type
      const subject = await tx.subject.update({
        where: { code },
        data: {
          name,
          type,
        },
      });

      // If classGroup is provided, update or create the section assignment
      if (classGroup !== undefined) {
        // Verify theory faculty if provided
        if (theoryFacultyId !== undefined) {
          const theoryFaculty = await tx.user.findUnique({
            where: { id: theoryFacultyId },
          });
          if (!theoryFaculty || theoryFaculty.role !== 'teacher') {
            throw new Error('Selected theory faculty member must be a teacher');
          }
        }

        // Verify lab faculty if provided
        if (labFacultyId !== undefined && labFacultyId !== null) {
          const labFaculty = await tx.user.findUnique({
            where: { id: labFacultyId },
          });
          if (!labFaculty || labFaculty.role !== 'teacher') {
            throw new Error('Selected lab faculty member must be a teacher');
          }
        }

        // Upsert the section assignment
        const assignment = await tx.subjectSectionAssignment.upsert({
          where: {
            subjectId_classGroup: {
              subjectId: subject.id,
              classGroup,
            },
          },
          update: {
            theoryFacultyId: theoryFacultyId ?? null,
            labFacultyId: labFacultyId ?? null,
          },
          create: {
            subjectId: subject.id,
            classGroup,
            theoryFacultyId: theoryFacultyId ?? null,
            labFacultyId: labFacultyId ?? null,
          },
        });

        return { subject, assignment };
      }

      return { subject };
    });

    return res.status(200).json({
      subject: result.subject,
      assignment: result.assignment,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error updating subject:', err);
    if (err.message === 'Selected theory faculty member must be a teacher' ||
        err.message === 'Selected lab faculty member must be a teacher') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  const code = req.params.code as string;

  try {
    if (isElectronicsHod(req)) {
      const subject = await prisma.subject.findUnique({
        where: { code },
        select: { assignments: { select: { classGroup: true } } },
      });
      if (
        !subject ||
        subject.assignments.length === 0 ||
        subject.assignments.some((assignment) => !isElectronicsClassGroup(assignment.classGroup))
      ) {
        return res.status(403).json({ error: 'EC HODs can only delete EC/ECE subjects' });
      }
    }

    // Start a transaction to check history and delete
    const result = await prisma.$transaction(async (tx) => {
      // Find the subject
      const subject = await tx.subject.findUnique({
        where: { code },
      });

      if (!subject) {
        throw new Error('Subject not found');
      }

      // Check if the subject has any history through its assignments
      const marksExist = await tx.mark.count({
        where: {
          assignment: {
            subjectId: subject.id
          }
        }
      });

      const attendanceSessionsExist = tx.attendanceSession.count({
        where: {
          assignment: {
            subjectId: subject.id
          }
        }
      });

      const timetableSlotsExist = tx.timetableSlot.count({
        where: {
          assignment: {
            subjectId: subject.id
          }
        }
      });

      const hasHistory = await Promise.all([marksExist, attendanceSessionsExist, timetableSlotsExist])
        .then(([marksCount, attendanceSessionsCount, timetableSlotsCount]) =>
          marksCount > 0 || attendanceSessionsCount > 0 || timetableSlotsCount > 0
        );

      if (hasHistory) {
        throw new Error('This subject has attendance, marks, or timetable history and cannot be deleted.');
      }

      // Delete all section assignments for this subject (should be safe now)
      await tx.subjectSectionAssignment.deleteMany({
        where: {
          subjectId: subject.id
        }
      });

      // Delete the subject
      await tx.subject.delete({
        where: { code }
      });

      return { success: true };
    });

    return res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error deleting subject:', err);
    if (err.message === 'Subject not found' ||
        err.message === 'This subject has attendance, marks, or timetable history and cannot be deleted.') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
