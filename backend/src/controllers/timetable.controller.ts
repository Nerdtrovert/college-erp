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
        OR: [
          { teacherId },
          { coTeacherId: teacherId }
        ],
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
  const semesterId = String(req.params.semesterId);
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
      whereClause.OR = [
        { teacherId: String(teacherId) },
        { coTeacherId: String(teacherId) }
      ];
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
              id: slot.id,
              subjectCode: slot.subjectCode,
              subject: slot.subject ? slot.subject.name : slot.subjectCode,
              room: slot.room || 'LH-N/A',
              class: slot.classGroup, // e.g. "CSE-B" for timetable
              teacherId: slot.teacherId,
              coTeacherId: slot.coTeacherId,
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

export const getTimetableClassGroups = async (req: AuthRequest, res: Response) => {
  const semesterId = String(req.params.semesterId);

  try {
    const slots = await prisma.timetableSlot.findMany({
      where: { semesterId },
      select: { classGroup: true },
      distinct: ['classGroup'],
      orderBy: { classGroup: 'asc' },
    });
    return res.json(slots.map((slot) => slot.classGroup));
  } catch (error) {
    console.error('Error fetching timetable class groups:', error);
    return res.status(500).json({ error: 'Unable to fetch timetable class groups' });
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
        OR: [
          { teacherId },
          { coTeacherId: teacherId }
        ],
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
            type: true,
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
            type: slot.subject.type,
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
  const { semesterId, day, slotIndex, classGroup, subjectCode, room, teacherId, coTeacherId } = req.body;
  if (!semesterId || !day || !classGroup || !subjectCode || !teacherId || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 7) {
    return res.status(400).json({ error: 'Semester, day, class group, subject, faculty, and a slot from 0 to 7 are required' });
  }

  try {
    const slot = await prisma.timetableSlot.upsert({
      where: { classGroup_day_slotIndex_semesterId: { classGroup, day, slotIndex, semesterId } },
      update: { subjectCode, room: room || null, teacherId, coTeacherId: coTeacherId || null },
      create: { semesterId, day, slotIndex, classGroup, subjectCode, room: room || null, teacherId, coTeacherId: coTeacherId || null },
    });
    return res.status(200).json(slot);
  } catch (error) {
    console.error('Error saving timetable slot:', error);
    return res.status(500).json({ error: 'Unable to save timetable slot. Check the selected subject and faculty IDs.' });
  }
};

/**
 * Get any faculty's timetable (HOD/Dean/Principal only)
 * Allows supervisors to view timetables of any faculty member
 */
export const getAnyFacultyTimetable = async (req: AuthRequest, res: Response) => {
  const { teacherId } = req.params;
  const { semesterId } = req.query;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID is required' });
  }

  // Validate that the requesting user is a supervisor (dean, principal, hod)
  // Authorization is handled by middleware, so we can assume the user is authorized

  try {
    const whereClause: any = {
      OR: [
        { teacherId },
        { coTeacherId: teacherId },
      ],
      semester: {
        status: semesterId ? undefined : 'ACTIVE', // If semesterId provided, don't filter by status
      },
    };

    // If specific semesterId is provided, use it; otherwise get active semester
    if (semesterId) {
      whereClause.semesterId = semesterId as string;
    } else {
      whereClause.semester = { status: 'ACTIVE' };
    }

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        subject: true,
        semester: true,
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
              id: slot.id,
              subjectCode: slot.subjectCode,
              subject: slot.subject ? slot.subject.name : slot.subjectCode,
              room: slot.room || 'LH-N/A',
              class: slot.classGroup,
              teacherId: slot.teacherId,
              coTeacherId: slot.coTeacherId,
              semester: slot.semester ? {
                id: slot.semester.id,
                name: slot.semester.name,
                status: slot.semester.status,
              } : null,
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
    console.error('Error fetching faculty timetable:', error);
    return res.status(500).json({ error: 'Internal server error while fetching faculty timetable' });
  }
};

/**
 * Get current classes for all faculty (for faculty status card)
 * Shows what each faculty is currently teaching based on current day and time
 */
export const getCurrentFacultyStatus = async (req: AuthRequest, res: Response) => {
  try {
    // Get current day and time
    const now = new Date();
    const indiaTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const indiaTime = Object.fromEntries(indiaTimeParts.map(({ type, value }) => [type, value]));
    const currentDay = indiaTime.weekday;
    const currentHours = Number(indiaTime.hour);
    const currentMinutes = Number(indiaTime.minute);
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // Define period boundaries (matching PERIOD_TIMES from attendance controller)
    const PERIOD_TIMES = [
      ['08:30', '09:30'], // Period 0
      ['09:30', '10:30'], // Period 1
      [null, null],       // Break (no class)
      ['11:00', '12:00'], // Period 2
      ['12:00', '13:00'], // Period 3
      [null, null],       // Lunch (no class)
      ['13:45', '14:45'], // Period 4
      ['14:45', '15:45'], // Period 5
    ];

    // Find current period index
    let currentPeriodIndex = -1;
    for (let i = 0; i < PERIOD_TIMES.length; i++) {
      const [startTime, endTime] = PERIOD_TIMES[i];
      if (!startTime || !endTime) continue; // Skip break/lunch periods

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
        currentPeriodIndex = i;
        break;
      }
    }

    // Get active semester
    const activeSemester = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!activeSemester) {
      return res.status(400).json({ error: 'No active semester found' });
    }

    // Get all faculty members (teachers, deans, principals, hods)
    const facultyMembers = await prisma.user.findMany({
      where: {
        role: {
          in: ['teacher', 'dean', 'principal', 'hod'],
        },
      },
      select: {
        id: true,
        name: true,
        department: true,
      },
    });

    // For each faculty member, check what they're teaching in the current period
    const facultyStatus = await Promise.all(
      facultyMembers.map(async (faculty) => {
        // Check if this faculty is teaching in the current period
        const timetableSlot = currentPeriodIndex === -1 ? null : await prisma.timetableSlot.findFirst({
          where: {
            OR: [
              { teacherId: faculty.id },
              { coTeacherId: faculty.id }
            ],
            day: currentDay,
            slotIndex: currentPeriodIndex,
            semesterId: activeSemester.id,
            subjectCode: { not: null }, // Only slots with actual subjects
          },
          include: {
            subject: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        });

        if (timetableSlot && timetableSlot.subject) {
          return {
            facultyId: faculty.id,
            facultyName: faculty.name,
            department: faculty.department || 'N/A',
            subjectCode: timetableSlot.subject.code,
            subjectName: timetableSlot.subject.name,
            room: timetableSlot.room || 'TBD',
            classGroup: timetableSlot.classGroup,
            periodIndex: currentPeriodIndex,
            periodLabel: currentPeriodIndex === -1 ? 'No active period' : PERIOD_TIMES[currentPeriodIndex][0] + '–' + PERIOD_TIMES[currentPeriodIndex][1],
          };
        } else {
          // Faculty is not teaching in current period
          return {
            facultyId: faculty.id,
            facultyName: faculty.name,
            department: faculty.department || 'N/A',
            subjectCode: null,
            subjectName: null,
            room: null,
            classGroup: null,
            periodIndex: currentPeriodIndex,
            periodLabel: currentPeriodIndex === -1 ? 'No active period' : PERIOD_TIMES[currentPeriodIndex][0] + '–' + PERIOD_TIMES[currentPeriodIndex][1],
            status: 'free', // Indicates not currently teaching
          };
        }
      })
    );

    return res.status(200).json({
      currentDay,
      currentTime: new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now),
      currentPeriodIndex,
      currentPeriodLabel: currentPeriodIndex === -1 ? 'No active period' : PERIOD_TIMES[currentPeriodIndex][0] + '–' + PERIOD_TIMES[currentPeriodIndex][1],
      semester: {
        id: activeSemester.id,
        name: activeSemester.name,
        status: activeSemester.status,
      },
      facultyStatus,
    });
  } catch (error) {
    console.error('Error fetching faculty status:', error);
    return res.status(500).json({ error: 'Internal server error while fetching faculty status' });
  }
};
