import { Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const getSlotSubjectCode = (slot: {
  subjectCode: string | null;
  assignment?: { subject: { code: string } | null } | null;
}) => slot.subjectCode ?? slot.assignment?.subject?.code ?? null;

export const getStudentTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: req.user!.id, semester: { status: 'ACTIVE' } },
      orderBy: { semester: { createdAt: 'desc' } },
    });
    if (!enrollment) return res.status(404).json({ error: 'No current student enrollment found' });
    const slots = await prisma.timetableSlot.findMany({
      where: { semesterId: enrollment.semesterId, classGroup: enrollment.classGroup },
      include: { assignment: { select: { subject: { select: { code: true } } } } },
      orderBy: [
        { day: 'asc' },
        { slotIndex: 'asc' },
        { updatedAt: 'asc' }, { id: 'asc' }
      ],
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        const subjectCode = getSlotSubjectCode(slot);
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (subjectCode) {
            slotsArray[slot.slotIndex] = {
              subjectCode,
              activityType: slot.activityType,
              room: slot.room,
              semesterId: slot.semesterId,
              classGroup: slot.classGroup,
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
  const teacherId = req.user?.email;

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID not found in session context' });
  }

  try {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: teacherId, mode: 'insensitive' } },
      select: { id: true, email: true },
    });
    const teacherIdentifiers = [...new Set([teacherId, teacher?.id].filter((value): value is string => Boolean(value)))];
    const slots = await prisma.timetableSlot.findMany({
      where: {
        OR: teacherIdentifiers.flatMap((id) => [{ teacherId: id }, { coTeacherId: id }]),
        semester: {
          status: 'ACTIVE',
        },
      },
      include: { assignment: { select: { subject: { select: { code: true } } } } },
      orderBy: [
        { day: 'asc' },
        { slotIndex: 'asc' },
        { updatedAt: 'asc' }, { id: 'asc' }
      ],
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        const subjectCode = getSlotSubjectCode(slot);
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (subjectCode) {
            slotsArray[slot.slotIndex] = {
              subjectCode,
              activityType: slot.activityType,
              room: slot.room,
              class: slot.classGroup,
              classGroup: slot.classGroup,
              semesterId: slot.semesterId,
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
  let semesterId = req.params.semesterId;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];
  semesterId = String(semesterId);
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
      const identifier = String(teacherId);
      const teacher = await prisma.user.findFirst({
        where: { email: { equals: identifier, mode: 'insensitive' } },
        select: { id: true, email: true },
      }) ?? (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
        ? await prisma.user.findUnique({ where: { id: identifier }, select: { id: true, email: true } })
        : null);
      const identifiers = [...new Set([identifier, teacher?.id, teacher?.email].filter((value): value is string => Boolean(value)))];
      whereClause.OR = identifiers.flatMap((id) => [{ teacherId: id }, { coTeacherId: id }]);
    }

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: { assignment: { select: { subject: { select: { code: true } } } } },
      orderBy: [
        { day: 'asc' },
        { slotIndex: 'asc' },
        { updatedAt: 'asc' }, { id: 'asc' }
      ],
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        const subjectCode = getSlotSubjectCode(slot);
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (subjectCode) {
            slotsArray[slot.slotIndex] = {
              id: slot.id,
              subjectCode,
              room: slot.room,
              class: slot.classGroup, // e.g. "CSE-B" for timetable
              teacherId: slot.teacherId,
              coTeacherId: slot.coTeacherId,
              activityType: slot.activityType,
              semesterId: slot.semesterId,
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
  let semesterId = req.params.semesterId;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];
  semesterId = String(semesterId);

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
  const teacherEmail = req.user?.email;
  if (!teacherEmail) {
    return res.status(400).json({ error: 'Teacher ID not found' });
  }
  try {
    const teacher = await prisma.user.findFirst({
      where: { email: { equals: teacherEmail, mode: 'insensitive' } },
      select: { id: true, email: true },
    });
    const teacherIdentifiers = [...new Set([teacherEmail, teacher?.id].filter((value): value is string => Boolean(value)))];
    // Get distinct subjects taught by the teacher in the active semester via timetable slots
    const slots = await prisma.timetableSlot.findMany({
      where: {
        OR: teacherIdentifiers.flatMap((id) => [{ teacherId: id }, { coTeacherId: id }]),
        semester: {
          status: 'ACTIVE',
        },
      },
      include: { assignment: { select: { subject: { select: { code: true, name: true, type: true } } } } },
    });

    const uniqueSlots = [...new Map(slots.map((slot) => {
      const subjectCode = getSlotSubjectCode(slot);
      return [`${slot.semesterId}|${slot.classGroup}|${subjectCode}`, { slot, subjectCode }];
    })).values()];
    const subjects = await Promise.all(uniqueSlots.filter(({ subjectCode }) => subjectCode).map(async ({ slot, subjectCode }) => {
      const subject = slot.assignment?.subject;
      const legacySubject = !subject && subjectCode
        ? await prisma.subject.findUnique({ where: { code: subjectCode } })
        : null;
      return {
        code: subjectCode!,
        name: subject?.name ?? legacySubject?.name ?? subjectCode!,
        classGroup: slot.classGroup,
        semesterId: slot.semesterId,
        type: subject?.type ?? legacySubject?.type ?? null,
      };
    }));

    return res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching teacher subjects:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveTimetableSlot = async (req: AuthRequest, res: Response) => {
  const { semesterId, day, slotIndex, classGroup, subjectCode, room, teacherId, coTeacherId, activityType } = req.body;
  if (!semesterId || !day || !classGroup || !subjectCode || !teacherId || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 7) {
    return res.status(400).json({ error: 'Semester, day, class group, subject, faculty, and a slot from 0 to 7 are required' });
  }

  try {
    const batchYearRecord = await prisma.studentEnrollment.findFirst({
      where: {
        semesterId,
        classGroup
      },
      select: {
        student: {
          select: {
            batchStartYear: true
          }
        }
      }
    });

    const existingSlot = await prisma.timetableSlot.findFirst({
      where: { classGroup, day, slotIndex, semesterId },
      orderBy: [ { updatedAt: 'desc' }, { id: 'desc' } ]
    });

    const batchYear = existingSlot?.batchYear ?? batchYearRecord?.student?.batchStartYear ?? null;

    const slot = await prisma.timetableSlot.upsert({
      where: { classGroup_day_slotIndex_semesterId: { classGroup, day, slotIndex, semesterId } },
      update: { subjectCode, room: room || null, teacherId, coTeacherId: coTeacherId || null, activityType, batchYear },
      create: { semesterId, day, slotIndex, classGroup, subjectCode, room: room || null, teacherId, coTeacherId: coTeacherId || null, activityType, batchYear },
    });
    return res.status(200).json(slot);
  } catch (error) {
    console.error('Error saving timetable slot:', error);
    return res.status(500).json({ error: 'Unable to save timetable slot. Check the subject, faculty, and batch year.' });
  }
};

/**
 * Get any faculty's timetable (HOD/Dean/Principal only)
 * Allows supervisors to view timetables of any faculty member
 */
export const getAnyFacultyTimetable = async (req: AuthRequest, res: Response) => {
  let { teacherId } = req.params;
  if (Array.isArray(teacherId)) teacherId = teacherId[0];
  let { semesterId } = req.query;
  if (Array.isArray(semesterId)) semesterId = semesterId[0];

  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID is required' });
  }

  // Validate that the requesting user is a supervisor (dean, principal, hod)
  // Authorization is handled by middleware, so we can assume the user is authorized

  try {
    const faculty = await prisma.user.findFirst({
      where: { email: { equals: teacherId, mode: 'insensitive' } },
      select: { id: true, email: true },
    }) ?? (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teacherId)
      ? await prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, email: true } })
      : null);
    const facultyEmail = faculty?.email ?? teacherId;
    const facultyIdentifiers = [...new Set([facultyEmail, faculty?.id].filter((value): value is string => Boolean(value)))];
    const whereClause: any = {
      OR: facultyIdentifiers.flatMap((id) => [{ teacherId: id }, { coTeacherId: id }]),
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
        semester: true,
        assignment: { select: { subject: { select: { code: true } } } },
      },
      orderBy: [
        { day: 'asc' },
        { slotIndex: 'asc' },
        { updatedAt: 'asc' }, { id: 'asc' }
      ],
    });

    // Format schedule for Monday through Friday with 8 periods per day
    const schedule = DAYS.map((day) => {
      const slotsArray = new Array(8).fill(null);
      const daySlots = slots.filter((s) => s.day.toLowerCase() === day.toLowerCase());

      daySlots.forEach((slot) => {
        const subjectCode = getSlotSubjectCode(slot);
        if (slot.slotIndex >= 0 && slot.slotIndex < 8) {
          if (subjectCode) {
            slotsArray[slot.slotIndex] = {
              id: slot.id,
              subjectCode,
              subject: subjectCode,
              room: slot.room,
              class: slot.classGroup,
              teacherId: slot.teacherId,
              coTeacherId: slot.coTeacherId,
              activityType: slot.activityType,
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
 * Get current classes for teachers during an active teaching period
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
      hourCycle: 'h23',
    }).formatToParts(now);
    const indiaTime = Object.fromEntries(indiaTimeParts.map(({ type, value }) => [type, value]));
    const currentDay = indiaTime.weekday;
    const isTeachingDay = DAYS.some((day) => day.toLowerCase() === currentDay.toLowerCase());
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
    for (let i = 0; isTeachingDay && i < PERIOD_TIMES.length; i++) {
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

    // Keep the active semester for display only. HODs need the live status of
    // their class groups even when those timetables belong to another semester.
    const activeSemester = await prisma.semester.findFirst({
      where: { status: 'ACTIVE' },
    });

    const currentPeriodLabel = currentPeriodIndex >= 0
      ? `${PERIOD_TIMES[currentPeriodIndex][0]}–${PERIOD_TIMES[currentPeriodIndex][1]}`
      : !isTeachingDay
        ? 'No classes scheduled today'
        : currentTimeInMinutes >= 15 * 60 + 45
          ? 'After college hours'
          : currentTimeInMinutes >= 13 * 60 && currentTimeInMinutes < 13 * 60 + 45
            ? 'Lunch break'
            : currentTimeInMinutes >= 10 * 60 + 30 && currentTimeInMinutes < 11 * 60
              ? 'Break'
              : currentTimeInMinutes < 8 * 60 + 30
                ? 'Before college hours'
                : 'No classes in session';

    let facultyStatus: {
      facultyId: string;
      facultyName: string;
      department: string;
      subjectCode: string | null;
      subjectName: string | null;
      room: string | null;
      classGroup: string | null;
      periodIndex: number;
      periodLabel: string;
      status?: 'free';
    }[] = [];

    if (currentPeriodIndex >= 0) {
      const hodDepartment = req.user?.department?.trim().toUpperCase() ?? '';
      const hodClassGroups = hodDepartment === 'EC' || hodDepartment === 'ECE'
        ? ['EC', 'ECE']
        : hodDepartment.includes('CSE')
          ? ['CSE-A', 'CSE-B', 'AIDS-A', 'AI&DS-A', 'ISE']
          : null;
      const facultyMembers = await prisma.user.findMany({
        // Supervisors can also be assigned to teach a class (for example, the
        // principal is assigned to ECE's Friday 11:00 period in the seed data).
        where: { role: { in: ['teacher', 'hod', 'dean', 'principal'] } },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
        },
      });

      facultyStatus = await Promise.all(
        facultyMembers.map(async (faculty) => {
          const timetableSlot = await prisma.timetableSlot.findFirst({
            where: {
              OR: [
                { teacherId: faculty.email ?? '' },
                { coTeacherId: faculty.email ?? '' },
                { teacherId: faculty.id },
                { coTeacherId: faculty.id },
              ],
              day: currentDay,
              slotIndex: currentPeriodIndex,
              ...(req.user?.role === 'hod' ? { classGroup: { in: hodClassGroups ?? [] } } : {}),
            },
            include: { assignment: { select: { subject: { select: { code: true, name: true } } } } },
          });

          const subjectCode = timetableSlot ? getSlotSubjectCode(timetableSlot) : null;
          if (timetableSlot && subjectCode) {
            const subjectName = timetableSlot.assignment?.subject?.name
              ?? (await prisma.subject.findUnique({ where: { code: subjectCode }, select: { name: true } }))?.name
              ?? subjectCode;
            return {
              facultyId: faculty.email ?? '',
              facultyName: faculty.name,
              department: faculty.department || 'N/A',
              subjectCode,
              subjectName,
              room: timetableSlot.room || 'TBD',
              classGroup: timetableSlot.classGroup,
              periodIndex: currentPeriodIndex,
              periodLabel: currentPeriodLabel,
            };
          }

          return {
            facultyId: faculty.email ?? '',
            facultyName: faculty.name,
            department: faculty.department || 'N/A',
            subjectCode: null,
            subjectName: null,
            room: null,
            classGroup: null,
            periodIndex: currentPeriodIndex,
            periodLabel: currentPeriodLabel,
            status: 'free',
          };
        })
      );
    }

    return res.status(200).json({
      currentDay,
      currentTime: new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now),
      currentPeriodIndex,
      currentPeriodLabel,
      semester: activeSemester ? {
        id: activeSemester.id,
        name: activeSemester.name,
        status: activeSemester.status,
      } : null,
      facultyStatus,
    });
  } catch (error) {
    console.error('Error fetching faculty status:', error);
    return res.status(500).json({ error: 'Internal server error while fetching faculty status' });
  }
};
