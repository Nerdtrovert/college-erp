import { PrismaClient } from '@prisma/client';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import app from '../app';

const prisma = new PrismaClient();

async function runSubjectManagementIntegrationTest() {
  console.log('--- Starting Subject Management Integration Test ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;
  console.log(`Test server running at ${baseUrl}`);

  const initialCode = 'TEST_SUB_101';
  const updatedCode = 'TEST_SUB_102';
  const conflictCode = 'TEST_SUB_200';
  const disposableStudentUsn = '1HC24CS888';
  const unrelatedCode = 'UNRELATED_SUB_999';

  const token = jwt.sign(
    { id: 'supervisor-test-id', email: 'hodcse@hnnce.edu', role: 'hod' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    // 0. Cleanup pre-existing test records
    await prisma.user.deleteMany({
      where: { email: disposableStudentUsn.toLowerCase() }
    });
    await prisma.timetableSlot.deleteMany({
      where: { subjectCode: { in: [initialCode, updatedCode, conflictCode] } }
    });
    await prisma.subjectSectionAssignment.deleteMany({
      where: { subject: { code: { in: [initialCode, updatedCode, conflictCode] } } }
    });
    await prisma.subject.deleteMany({
      where: { code: { in: [initialCode, updatedCode, conflictCode] } }
    });

    // 1. Create a subject via POST /api/subjects
    console.log('\nStep 1: Creating subject via POST /api/subjects...');
    const createRes = await fetch(`${baseUrl}/subjects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: initialCode,
        name: 'Initial Software Architecture',
        type: 'STANDALONE'
      })
    });
    const createData = await createRes.json();
    console.log(`Create status: ${createRes.status}`, createData.message || createData.error);
    if (createRes.status !== 201) {
      throw new Error(`Expected 201 Created but got ${createRes.status}: ${JSON.stringify(createData)}`);
    }

    const createdDbSub = await prisma.subject.findUnique({ where: { code: initialCode } });
    if (!createdDbSub) throw new Error('Subject not found in PostgreSQL after creation');
    if (createdDbSub.type !== 'STANDALONE') throw new Error('Type mismatch');
    const stableId = createdDbSub.id;
    console.log(`✓ Subject created in PostgreSQL with stable UUID: ${stableId}`);

    // Create conflict subject
    await fetch(`${baseUrl}/subjects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: conflictCode,
        name: 'Conflict Subject',
        type: 'STANDALONE'
      })
    });

    // 2. Edit Subject Name
    console.log('\nStep 2: Updating subject name via PUT /api/subjects/:code...');
    const updateNameRes = await fetch(`${baseUrl}/subjects/${initialCode}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Advanced Software Architecture'
      })
    });
    const updateNameData = await updateNameRes.json();
    console.log(`Update name status: ${updateNameRes.status}`, updateNameData.message || updateNameData.error);
    if (updateNameRes.status !== 200) {
      throw new Error(`Expected 200 OK but got ${updateNameRes.status}: ${JSON.stringify(updateNameData)}`);
    }

    const nameDbSub = await prisma.subject.findUnique({ where: { code: initialCode } });
    if (nameDbSub?.name !== 'Advanced Software Architecture') throw new Error('Subject name not updated in DB');
    if (nameDbSub.id !== stableId) throw new Error('Subject UUID changed during name update');
    console.log('✓ Subject name update verified in PostgreSQL!');

    // 3. Edit Evaluation Schema (Type: STANDALONE -> INTEGRATED)
    console.log('\nStep 3: Updating evaluation schema via PUT /api/subjects/:code...');
    const updateTypeRes = await fetch(`${baseUrl}/subjects/${initialCode}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'INTEGRATED'
      })
    });
    const updateTypeData = await updateTypeRes.json();
    console.log(`Update schema status: ${updateTypeRes.status}`, updateTypeData.message || updateTypeData.error);
    if (updateTypeRes.status !== 200) {
      throw new Error(`Expected 200 OK but got ${updateTypeRes.status}`);
    }

    const typeDbSub = await prisma.subject.findUnique({ where: { code: initialCode } });
    if (typeDbSub?.type !== 'INTEGRATED') throw new Error('Subject type was not updated to INTEGRATED');
    console.log('✓ Evaluation schema update verified in PostgreSQL!');

    // Setup an assignment and timetable slot with initialCode to test code update propagation
    const semester = await prisma.semester.findFirst({ where: { status: 'ACTIVE' } });
    if (semester) {
      const teacher = await prisma.user.findFirst({ where: { role: 'teacher' } });
      if (teacher) {
        const assignment = await prisma.subjectSectionAssignment.create({
          data: {
            subjectId: stableId,
            classGroup: 'TEST-SECTION',
            theoryFacultyId: teacher.id
          }
        });
        await prisma.timetableSlot.create({
          data: {
            classGroup: 'TEST-SECTION',
            day: 'MONDAY',
            slotIndex: 9,
            subjectCode: initialCode,
            teacherId: teacher.id,
            semesterId: semester.id,
            assignmentId: assignment.id
          }
        });
      }
    }

    // Setup a disposable test student with initialCode and an unrelated code in backlogSubjects
    const disposableStudent = await prisma.user.create({
      data: {
        email: disposableStudentUsn.toLowerCase(),
        name: 'Disposable Backlog Student',
        password: 'hashedPassword123',
        role: 'student',
        program: 'CSE',
        classGroup: 'CSE-A',
        numberOfBacklogs: 2,
        backlogSubjects: [initialCode, unrelatedCode],
      }
    });

    // 4. Test Duplicate Subject Code Rejection (Conflict Code)
    console.log('\nStep 4: Testing duplicate subject code rejection...');
    const dupRes = await fetch(`${baseUrl}/subjects/${initialCode}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        code: conflictCode
      })
    });
    const dupData = await dupRes.json();
    console.log(`Duplicate code rejection status: ${dupRes.status}`, dupData.error);
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate subject code but got ${dupRes.status}`);
    }
    console.log('✓ Duplicate subject code rejection verified!');

    // 5. Edit Subject Code (initialCode -> updatedCode)
    console.log('\nStep 5: Updating subject code via PUT /api/subjects/:code...');
    const updateCodeRes = await fetch(`${baseUrl}/subjects/${initialCode}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        code: updatedCode,
        name: 'Advanced Software Architecture Final'
      })
    });
    const updateCodeData = await updateCodeRes.json();
    console.log(`Update code status: ${updateCodeRes.status}`, updateCodeData.message || updateCodeData.error);
    if (updateCodeRes.status !== 200) {
      throw new Error(`Expected 200 OK but got ${updateCodeRes.status}: ${JSON.stringify(updateCodeData)}`);
    }

    const oldDbSub = await prisma.subject.findUnique({ where: { code: initialCode } });
    if (oldDbSub) throw new Error('Old subject code still exists in DB');
    const newDbSub = await prisma.subject.findUnique({ where: { code: updatedCode } });
    if (!newDbSub) throw new Error('New subject code not found in DB');
    if (newDbSub.id !== stableId) throw new Error('Subject stable UUID changed during code update');

    // Verify timetable slot was synchronized with new subjectCode
    const updatedSlot = await prisma.timetableSlot.findFirst({
      where: { classGroup: 'TEST-SECTION', slotIndex: 9 }
    });
    if (updatedSlot && updatedSlot.subjectCode !== updatedCode) {
      throw new Error(`TimetableSlot subjectCode was NOT synchronized: ${updatedSlot.subjectCode}`);
    }
    console.log('✓ Subject code update and timetable synchronization verified in PostgreSQL!');

    // Verify student backlogSubjects was synchronized:
    const updatedStudent = await prisma.user.findUnique({
      where: { id: disposableStudent.id },
      select: { backlogSubjects: true }
    });
    if (!updatedStudent) throw new Error('Disposable student not found');
    if (!updatedStudent.backlogSubjects.includes(updatedCode)) {
      throw new Error(`Disposable student backlogSubjects does not contain updatedCode: ${JSON.stringify(updatedStudent.backlogSubjects)}`);
    }
    if (updatedStudent.backlogSubjects.includes(initialCode)) {
      throw new Error(`Disposable student backlogSubjects still contains initialCode: ${JSON.stringify(updatedStudent.backlogSubjects)}`);
    }
    if (!updatedStudent.backlogSubjects.includes(unrelatedCode)) {
      throw new Error(`Disposable student backlogSubjects lost unrelatedCode: ${JSON.stringify(updatedStudent.backlogSubjects)}`);
    }
    console.log('✓ Student backlogSubjects synchronization verified in PostgreSQL (old code updated, unrelated code preserved)!');

    // 6. Test GET /api/subjects to verify inventory retrieval
    console.log('\nStep 6: Verifying GET /api/subjects inventory retrieval...');
    const listRes = await fetch(`${baseUrl}/subjects`, { headers: authHeaders });
    const listData = await listRes.json();
    if (listRes.status !== 200 || !Array.isArray(listData)) {
      throw new Error(`Expected 200 OK array for subjects list: ${listRes.status}`);
    }
    const foundUpdated = listData.find((s: any) => s.code === updatedCode);
    if (!foundUpdated) throw new Error('Updated subject not present in GET /api/subjects');
    if (foundUpdated.name !== 'Advanced Software Architecture Final') throw new Error('Updated name not reflected in list');
    if (foundUpdated.type !== 'INTEGRATED') throw new Error('Updated type not reflected in list');
    console.log('✓ Global inventory query verified!');

    // 7. Cleanup
    console.log('\nStep 7: Cleaning up test records...');
    await prisma.user.deleteMany({
      where: { email: disposableStudentUsn.toLowerCase() }
    });
    await prisma.timetableSlot.deleteMany({
      where: { classGroup: 'TEST-SECTION', slotIndex: 9 }
    });
    await prisma.subjectSectionAssignment.deleteMany({
      where: { subjectId: stableId }
    });
    await prisma.subject.deleteMany({
      where: { code: { in: [initialCode, updatedCode, conflictCode] } }
    });
    console.log('✓ Cleanup completed!');

    console.log('\n========================================');
    console.log('ALL SUBJECT MANAGEMENT TESTS PASSED!');
    console.log('========================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSubjectManagementIntegrationTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
