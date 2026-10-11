import assert from 'node:assert/strict';
import test from 'node:test';
import { seedTimetable } from '../timetable';

// Mock in-memory store simulating TimetableSlot table
interface MockSlot {
  id: string;
  day: string;
  slotIndex: number;
  room?: string | null;
  classGroup: string;
  studentSemesterNumber?: number | null;
  subjectCode?: string | null;
  teacherId: string;
  coTeacherId?: string | null;
  semesterId: string;
  batchYear?: number | null;
  assignmentId?: string | null;
  activityType?: string | null;
}

function createMockPrisma(initialSlots: MockSlot[] = []) {
  const slots: MockSlot[] = [...initialSlots];
  let idCounter = 1;

  const mockSubjects = [
    { id: 'sub-brmk557', code: 'BRMK557' },
    { id: 'sub-bcs501', code: 'BCS501' },
    { id: 'sub-bcs502', code: 'BCS502' },
    { id: 'sub-bcs503', code: 'BCS503' },
    { id: 'sub-bcs508', code: 'BCS508' },
    { id: 'sub-bcs515b', code: 'BCS515B' },
    { id: 'sub-bcsl504', code: 'BCSL504' },
    { id: 'sub-bis586', code: 'BIS586' },
    { id: 'sub-bec501', code: 'BEC501' },
    { id: 'sub-bec502', code: 'BEC502' },
    { id: 'sub-bec503', code: 'BEC503' },
    { id: 'sub-becl504', code: 'BECL504' },
    { id: 'sub-bec515d', code: 'BEC515D' },
    { id: 'sub-besk508', code: 'BESK508' },
    { id: 'sub-bail504', code: 'BAIL504' },
  ];

  return {
    slots,
    client: {
      subject: {
        findUnique: async ({ where }: { where: { code: string } }) => {
          return mockSubjects.find(s => s.code === where.code) || null;
        }
      },
      timetableSlot: {
        findUnique: async ({ where }: any) => {
          const compound = where.classGroup_day_slotIndex_semesterId_studentSemesterNumber;
          if (!compound) return null;
          return slots.find(s =>
            s.classGroup === compound.classGroup &&
            s.day === compound.day &&
            s.slotIndex === compound.slotIndex &&
            s.semesterId === compound.semesterId &&
            s.studentSemesterNumber === compound.studentSemesterNumber
          ) || null;
        },
        findFirst: async ({ where }: any) => {
          return slots.find(s => {
            if (where.classGroup && s.classGroup !== where.classGroup) return false;
            if (where.day && s.day !== where.day) return false;
            if (where.slotIndex !== undefined && s.slotIndex !== where.slotIndex) return false;
            if (where.semesterId && s.semesterId !== where.semesterId) return false;
            if (where.studentSemesterNumber === null && s.studentSemesterNumber !== null) return false;
            return true;
          }) || null;
        },
        create: async ({ data }: any) => {
          const newSlot: MockSlot = {
            id: `slot-${idCounter++}`,
            ...data
          };
          slots.push(newSlot);
          return newSlot;
        },
        update: async ({ where, data }: any) => {
          const index = slots.findIndex(s => s.id === where.id);
          if (index === -1) throw new Error(`Record not found for id ${where.id}`);
          slots[index] = { ...slots[index], ...data };
          return slots[index];
        }
      }
    } as any
  };
}

const defaultSemester = {
  id: 'sem-2026-fall',
  code: 'SEM-2026-FALL',
  name: 'Fall 2026',
  startDate: new Date('2026-08-01'),
  endDate: new Date('2026-12-31'),
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date()
} as any;

const sampleAssignments = [
  { classGroup: 'CSE-A', subjectId: 'sub-brmk557', id: 'assign-brmk557' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcs501', id: 'assign-bcs501' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcs502', id: 'assign-bcs502' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcs503', id: 'assign-bcs503' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcs508', id: 'assign-bcs508' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcs515b', id: 'assign-bcs515b' },
  { classGroup: 'CSE-A', subjectId: 'sub-bcsl504', id: 'assign-bcsl504' },
  { classGroup: 'CSE-A', subjectId: 'sub-bis586', id: 'assign-bis586' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcs501', id: 'assign-bcs501-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcs502', id: 'assign-bcs502-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcs503', id: 'assign-bcs503-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcs508', id: 'assign-bcs508-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcs515b', id: 'assign-bcs515b-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bcsl504', id: 'assign-bcsl504-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-bis586', id: 'assign-bis586-b' },
  { classGroup: 'CSE-B', subjectId: 'sub-brmk557', id: 'assign-brmk557-b' },
];

test('Timetable Seed: Semesters 1, 3, and 5 can have slots at the same day/period', async () => {
  const { slots, client } = createMockPrisma([
    {
      id: 'slot-sem1',
      day: 'Monday',
      slotIndex: 0,
      classGroup: 'CSE-A',
      studentSemesterNumber: 1,
      subjectCode: 'BCS101',
      room: 'LH-1',
      teacherId: 'teacher1@hnnce.in',
      semesterId: defaultSemester.id,
    },
    {
      id: 'slot-sem3',
      day: 'Monday',
      slotIndex: 0,
      classGroup: 'CSE-A',
      studentSemesterNumber: 3,
      subjectCode: 'BCS301',
      room: 'LH-3',
      teacherId: 'teacher3@hnnce.in',
      semesterId: defaultSemester.id,
    }
  ]);

  // Run timetable seed which seeds Semester 5 slots
  await seedTimetable(client, defaultSemester, sampleAssignments);

  // Find Monday Period 0 for CSE-A
  const mondayPeriod0Slots = slots.filter(s => s.classGroup === 'CSE-A' && s.day === 'Monday' && s.slotIndex === 0);
  assert.strictEqual(mondayPeriod0Slots.length, 3, 'Expected 3 distinct slots for semesters 1, 3, and 5 at Monday Period 0');

  const semNumbers = mondayPeriod0Slots.map(s => s.studentSemesterNumber).sort();
  assert.deepStrictEqual(semNumbers, [1, 3, 5], 'Expected slots for semester numbers 1, 3, and 5 to coexist');
});

test('Timetable Seed: Repeated seed execution does not create duplicate slots (idempotency)', async () => {
  const { slots, client } = createMockPrisma();

  // First seed execution
  await seedTimetable(client, defaultSemester, sampleAssignments);
  const countAfterRun1 = slots.length;
  assert.ok(countAfterRun1 > 0, 'First run should seed timetable slots');

  // Second seed execution
  await seedTimetable(client, defaultSemester, sampleAssignments);
  const countAfterRun2 = slots.length;

  assert.strictEqual(countAfterRun1, countAfterRun2, 'Repeated seed execution must not create duplicate slots');
});

test('Timetable Seed: Existing operational timetable edits are preserved', async () => {
  const { slots, client } = createMockPrisma([
    {
      id: 'slot-edited-cse-a',
      day: 'Monday',
      slotIndex: 0,
      classGroup: 'CSE-A',
      studentSemesterNumber: 5,
      subjectCode: 'BRMK557',
      room: 'Custom Room 404',        // Manually customized by supervisor
      teacherId: 'custom_prof@hnnce.in', // Manually customized faculty
      activityType: 'CUSTOM_TYPE',   // Manually customized activity
      coTeacherId: 'coteacher@hnnce.in',
      semesterId: defaultSemester.id,
      assignmentId: null             // Missing assignmentId
    }
  ]);

  // Run seed
  await seedTimetable(client, defaultSemester, sampleAssignments);

  // Locate the slot
  const slot = slots.find(s => s.id === 'slot-edited-cse-a');
  assert.ok(slot, 'Existing slot should remain');
  assert.strictEqual(slot.room, 'Custom Room 404', 'Supervisor customized room must not be overwritten');
  assert.strictEqual(slot.teacherId, 'custom_prof@hnnce.in', 'Supervisor customized teacher must not be overwritten');
  assert.strictEqual(slot.activityType, 'CUSTOM_TYPE', 'Supervisor customized activityType must not be overwritten');
  assert.strictEqual(slot.assignmentId, 'assign-brmk557', 'Missing assignmentId should be populated');
});

test('Timetable Seed: NULL legacy records are handled safely without compound key crash', async () => {
  const { slots, client } = createMockPrisma([
    {
      id: 'legacy-slot-null',
      day: 'Monday',
      slotIndex: 0,
      classGroup: 'CSE-A',
      studentSemesterNumber: null, // Legacy unmigrated slot with null semester number
      subjectCode: 'BRMK557',
      room: 'Old Room',
      teacherId: 'old_teacher@hnnce.in',
      semesterId: defaultSemester.id,
      assignmentId: null
    }
  ]);

  // Run seed
  await seedTimetable(client, defaultSemester, sampleAssignments);

  // The legacy null slot should still be preserved
  const legacySlot = slots.find(s => s.id === 'legacy-slot-null');
  assert.ok(legacySlot, 'Legacy slot with studentSemesterNumber=null must be preserved');
  assert.strictEqual(legacySlot.studentSemesterNumber, null);
});

test('Timetable Seed: A slot for one student semester never overwrites another', async () => {
  const { slots, client } = createMockPrisma([
    {
      id: 'slot-sem3-tuesday',
      day: 'Tuesday',
      slotIndex: 0,
      classGroup: 'CSE-A',
      studentSemesterNumber: 3,
      subjectCode: 'BCS301',
      room: 'Room-301',
      teacherId: 'teacher3@hnnce.in',
      semesterId: defaultSemester.id,
    }
  ]);

  // Run seed (which seeds Tuesday Period 0 for Semester 5 BCS502)
  await seedTimetable(client, defaultSemester, sampleAssignments);

  // Sem 3 slot must remain completely unchanged
  const sem3Slot = slots.find(s => s.id === 'slot-sem3-tuesday');
  assert.ok(sem3Slot, 'Semester 3 slot must exist');
  assert.strictEqual(sem3Slot.subjectCode, 'BCS301');
  assert.strictEqual(sem3Slot.studentSemesterNumber, 3);
  assert.strictEqual(sem3Slot.room, 'Room-301');

  // Sem 5 slot must have been added independently
  const sem5Slot = slots.find(s =>
    s.classGroup === 'CSE-A' && s.day === 'Tuesday' && s.slotIndex === 0 && s.studentSemesterNumber === 5
  );
  assert.ok(sem5Slot, 'Semester 5 slot must exist independently');
  assert.strictEqual(sem5Slot.subjectCode, 'BCS502');
  assert.notStrictEqual(sem3Slot.id, sem5Slot.id);
});
