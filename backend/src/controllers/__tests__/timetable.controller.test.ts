import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../prisma/client';
import { getStudentTimetable } from '../timetable.controller';
import { AuthRequest } from '../../types';

test('getStudentTimetable regression: filters strictly by studentSemesterNumber', async (t) => {
  const originalFindFirst = prisma.studentEnrollment.findFirst;
  const originalFindMany = prisma.timetableSlot.findMany;

  t.after(() => {
    prisma.studentEnrollment.findFirst = originalFindFirst;
    prisma.timetableSlot.findMany = originalFindMany;
  });

  const mockSlots = [
    {
      id: 'slot-sem5',
      day: 'Monday',
      slotIndex: 0,
      subjectCode: 'BCS501',
      room: 'Room 501',
      activityType: 'Theory',
      semesterId: 'active-sem-uuid',
      classGroup: 'CSE-A',
      studentSemesterNumber: 5,
      assignment: { subject: { code: 'BCS501' } },
    },
    {
      id: 'slot-sem3',
      day: 'Monday',
      slotIndex: 1,
      subjectCode: '1BCS301',
      room: 'Room 301',
      activityType: 'Theory',
      semesterId: 'active-sem-uuid',
      classGroup: 'CSE-A',
      studentSemesterNumber: 3,
      assignment: { subject: { code: '1BCS301' } },
    },
    {
      id: 'slot-legacy-null',
      day: 'Monday',
      slotIndex: 2,
      subjectCode: 'LEGACY101',
      room: 'Room 101',
      activityType: 'Theory',
      semesterId: 'active-sem-uuid',
      classGroup: 'CSE-A',
      studentSemesterNumber: null,
      assignment: { subject: { code: 'LEGACY101' } },
    },
  ];

  let capturedWhereClause: any = null;

  // Mock enrollment to return a semester 5 student in CSE-A
  prisma.studentEnrollment.findFirst = (async (args: any) => {
    assert.strictEqual(args.where.studentId, 'student-5-uuid');
    assert.strictEqual(args.where.semester.status, 'ACTIVE');
    return {
      id: 'enrollment-5',
      studentId: 'student-5-uuid',
      semesterId: 'active-sem-uuid',
      semesterNumber: 5,
      program: 'CSE',
      classGroup: 'CSE-A',
    };
  }) as any;

  // Mock timetableSlot.findMany to simulate Prisma query execution with the passed where clause
  prisma.timetableSlot.findMany = (async (args: any) => {
    capturedWhereClause = args.where;
    return mockSlots.filter((slot) => {
      if (args.where.semesterId && slot.semesterId !== args.where.semesterId) return false;
      if (args.where.classGroup && slot.classGroup !== args.where.classGroup) return false;
      if (args.where.studentSemesterNumber !== undefined) {
        return slot.studentSemesterNumber === args.where.studentSemesterNumber;
      }
      return true;
    });
  }) as any;

  const req = {
    user: {
      id: 'student-5-uuid',
      role: 'student',
      classGroup: 'CSE-A',
    },
  } as unknown as AuthRequest;

  let statusCode = 200;
  let jsonResponse: any = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: any) => {
      jsonResponse = body;
      return res;
    },
  } as any;

  await getStudentTimetable(req, res);

  // 1. Verify status code
  assert.strictEqual(statusCode, 200);

  // 2. Verify captured Prisma query criteria:
  // Must filter strictly by studentSemesterNumber without an OR condition including null
  assert.strictEqual(capturedWhereClause.semesterId, 'active-sem-uuid');
  assert.strictEqual(capturedWhereClause.classGroup, 'CSE-A');
  assert.strictEqual(capturedWhereClause.studentSemesterNumber, 5);
  assert.strictEqual(capturedWhereClause.OR, undefined, 'Must not include OR condition for studentSemesterNumber');

  // 3. Verify response structure: array of 5 days Monday to Friday, each with 8 slots
  assert.ok(Array.isArray(jsonResponse), 'Response must be an array');
  assert.strictEqual(jsonResponse.length, 5, 'Must contain 5 days (Monday through Friday)');
  const expectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  jsonResponse.forEach((daySchedule: any, index: number) => {
    assert.strictEqual(daySchedule.day, expectedDays[index]);
    assert.ok(Array.isArray(daySchedule.slots), 'Day schedule must contain slots array');
    assert.strictEqual(daySchedule.slots.length, 8, 'Slots array must contain exactly 8 period slots');
  });

  // 4. Verify slots contents for Monday:
  const mondaySlots = jsonResponse[0].slots;

  // A semester-5 student receives semester-5 slots
  assert.notStrictEqual(mondaySlots[0], null, 'Period 0 must be populated');
  assert.strictEqual(mondaySlots[0].subjectCode, 'BCS501');
  assert.strictEqual(mondaySlots[0].room, 'Room 501');
  assert.strictEqual(mondaySlots[0].activityType, 'Theory');
  assert.strictEqual(mondaySlots[0].semesterId, 'active-sem-uuid');
  assert.strictEqual(mondaySlots[0].classGroup, 'CSE-A');

  // The same student does not receive semester-3 slots
  assert.strictEqual(mondaySlots[1], null, 'Period 1 (Semester-3 slot) must NOT be received');

  // The same student does not receive NULL studentSemesterNumber slots
  assert.strictEqual(mondaySlots[2], null, 'Period 2 (Legacy NULL slot) must NOT be received');

  // Periods 3 through 7 are empty
  for (let i = 3; i < 8; i++) {
    assert.strictEqual(mondaySlots[i], null, `Period ${i} must be null`);
  }
});

test('getStudentTimetable validation: returns 400 when enrollment.semesterNumber is missing or invalid, findMany is not called', async (t) => {
  const originalFindFirst = prisma.studentEnrollment.findFirst;
  const originalFindMany = prisma.timetableSlot.findMany;

  t.after(() => {
    prisma.studentEnrollment.findFirst = originalFindFirst;
    prisma.timetableSlot.findMany = originalFindMany;
  });

  let findManyCalled = false;
  prisma.timetableSlot.findMany = (async () => {
    findManyCalled = true;
    return [];
  }) as any;

  const invalidSemesterNumbers = [
    null,
    undefined,
    0,      // out of range (below 1)
    -1,     // negative
    9,      // out of range (above 8)
    5.5,    // non-integer
    '5',    // string type
  ];

  for (const invalidSem of invalidSemesterNumbers) {
    findManyCalled = false;

    prisma.studentEnrollment.findFirst = (async () => ({
      id: 'enrollment-invalid',
      studentId: 'student-invalid-uuid',
      semesterId: 'active-sem-uuid',
      semesterNumber: invalidSem,
      program: 'CSE',
      classGroup: 'CSE-A',
    })) as any;

    const req = {
      user: {
        id: 'student-invalid-uuid',
        role: 'student',
        classGroup: 'CSE-A',
      },
    } as unknown as AuthRequest;

    let statusCode = 200;
    let jsonResponse: any = null;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        jsonResponse = body;
        return res;
      },
    } as any;

    await getStudentTimetable(req, res);

    assert.strictEqual(
      statusCode,
      400,
      `Expected status 400 for semesterNumber=${invalidSem}, got ${statusCode}`
    );
    assert.deepStrictEqual(
      jsonResponse,
      { error: 'Student enrollment lacks a valid semester number' },
      `Expected error body for semesterNumber=${invalidSem}`
    );
    assert.strictEqual(
      findManyCalled,
      false,
      `prisma.timetableSlot.findMany must not be called when semesterNumber=${invalidSem}`
    );
  }
});

