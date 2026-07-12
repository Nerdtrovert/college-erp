import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const getStudentTimetable = async (req: AuthRequest, res: Response) => {
  const classGroup = req.user?.classGroup;

  if (!classGroup) {
    return res.status(400).json({ error: 'No class group section assigned to this student user' });
  }

  try {
    const slots = await prisma.timetableSlot.findMany({
      where: {
        classGroup,
        semester: {
          status: 'ACTIVE',
        },
      },
      include: {
        subject: true,
      },
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (slot.subjectCode) {
            slotsArray[slot.slotIndex] = {
              subject: slot.subject ? slot.subject.name : slot.subjectCode,
              room: slot.room || 'LH-N/A',
            };
          }
        }
      });

      return {
        day,
        slots: slotsArray,
      };
    });

    return res.status(200).json(schedule);
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    return res.status(500).json({ error: 'Internal server error while fetching student schedule' });
  }
};

export const getTeacherTimetable = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user?.id;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found in session context' });
  }

  try {
    const slots = await prisma.timetableSlot.findMany({
      where: {
        teacherId,
        semester: {
          status: 'ACTIVE',
        },
      },
      include: {
        subject: true,
      },
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (slot.subjectCode) {
            slotsArray[slot.slotIndex] = {
              subject: slot.subject ? slot.subject.name : slot.subjectCode,
              room: slot.room || 'LH-N/A',
              class: slot.classGroup, // e.g. "CSE-B" for teacher timetable
            };
          }
        }
      });

      return {
        day,
        slots: slotsArray,
      };
    });

    return res.status(200).json(schedule);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    return res.status(500).json({ error: 'Internal server error while fetching teacher timetable' });
  }
};

export const getTimetableBySemester = async (req: AuthRequest, res: Response) => {
  const { semesterId } = req.params;
  const { classGroup, teacherId } = req.query;

  // Validate that either classGroup or teacherId is provided
  if (!classGroup && !teacherId) {
    return res.status(400).json({ error: 'Either classGroup or teacherId must be provided' });
  }

  try {
    const whereClause: any = {
      semesterId: semesterId,
    };

    if (classGroup) {
      whereClause.classGroup = classGroup;
    }

    if (teacherId) {
      whereClause.teacherId = teacherId;
    }

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        subject: true,
      },
      orderBy: [
        { day: 'asc' },
        { slotIndex: 'asc' },
      ],
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (slot.subjectCode) {
            slotsArray[slot.slotIndex] = {
              subject: slot.subject ? slot.subject.name : slot.subjectCode,
              room: slot.room || 'LH-N/A',
              class: slot.classGroup, // e.g. "CSE-B" for timetable
              teacherId: slot.teacherId,
            };
          }
        }
      });

      return {
        day,
        slots: slotsArray,
      };
    });

    return res.status(200).json(schedule);
  } catch (error) {
    console.error('Error fetching timetable by semester:', error);
    return res.status(500).json({ error: 'Internal server error while fetching timetable' });
  }
};

export const getTeacherSubjects = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user?.id;
  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found' });
  }
  try {
    // Get distinct subjects taught by the teacher in the active semester via timetable slots
    const slots = await prisma.timetableSlot.findMany({
      where: {
        teacherId,
        semester: {
          status: 'ACTIVE',
        },
        subject: { isNot: null },
      },
      select: {
        subject: {
          select: {
            code: true,
            name: true,
            classGroup: true,
          },
        },
      },
    });

    // Deduplicate by subject code
    const seen = new Set<string>();
    const subjects: any[] = [];
    for (const slot of slots) {
      if (slot.subject) {
        const code = slot.subject.code;
        if (!seen.has(code)) {
          seen.add(code);
          subjects.push({
            code: slot.subject.code,
            name: slot.subject.name,
            classGroup: slot.subject.classGroup,
          });
        }
      }
    }

    return res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveTimetableSlot = async (req: AuthRequest, res: Response) => {
  const { semesterId, day, slotIndex, classGroup, subjectCode, room, teacherId } = req.body;
  if (!semesterId || !day || !classGroup || !subjectCode || !teacherId || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 7) {
    return res.status(400).json({ error: 'Semester, day, class group, subject, faculty, and a slot from 0 to 7 are required' });
  }

  try {
    const slot = await prisma.timetableSlot.upsert({
      where: { classGroup_day_slotIndex_semesterId: { classGroup, day, slotIndex, semesterId } },
      update: { subjectCode, room: room || null, teacherId },
      create: { semesterId, day, slotIndex, classGroup, subjectCode, room: room || null, teacherId },
    });
    return res.status(200).json(slot);
  } catch (error) {
    console.error('Error saving timetable slot:', error);
    return res.status(500).json({ error: 'Unable to save timetable slot. Check the selected subject and faculty IDs.' });
  }
};
