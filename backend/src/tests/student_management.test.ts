import { PrismaClient } from '@prisma/client';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import app from '../app';

const prisma = new PrismaClient();

async function runStudentManagementIntegrationTest() {
  console.log('--- Starting Student Management Integration Test ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api`;
  console.log(`Test server running at ${baseUrl}`);

  const testUsn = '1HC24CS999';

  // Generate HOD token for supervisor operations
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
    // 0. Clean up any pre-existing test record
    const existing = await prisma.user.findFirst({
      where: { email: testUsn.toLowerCase() }
    });
    if (existing) {
      await prisma.studentEnrollment.deleteMany({ where: { studentId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    // Get an existing semester for enrollment
    let semester = await prisma.semester.findFirst({ where: { status: 'ACTIVE' } });
    if (!semester) {
      semester = await prisma.semester.findFirst();
    }
    if (!semester) {
      semester = await prisma.semester.create({
        data: {
          name: 'Test Semester 2024-2025',
          code: 'TEST-SEM-2024',
          startDate: '2024-08-01',
          endDate: '2024-12-31',
          status: 'ACTIVE',
        }
      });
    }
    const semesterId = semester.id;
    console.log(`Using semester: ${semester.name} (${semesterId})`);

    // 1. Test Single Student Registration (POST /api/auth/register)
    console.log('\nStep 1: Registering new individual student...');
    const registerPayload = {
      email: testUsn,
      name: 'Integration Test Student',
      password: 'studentPassword123',
      role: 'student',
      program: 'CSE',
      classGroup: 'CSE-A',
      semesterId,
      numberOfBacklogs: 2,
      backlogSubjects: ['24CS101', '24MA101'],
    };

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(registerPayload),
    });

    const regData = await regRes.json();
    console.log(`Registration status: ${regRes.status}`, regData.message || regData.error);
    if (regRes.status !== 201) {
      throw new Error(`Expected 201 Created but received ${regRes.status}: ${JSON.stringify(regData)}`);
    }

    // Verify directly in PostgreSQL via Prisma
    const dbUser = await prisma.user.findUnique({
      where: { email: testUsn.toLowerCase() },
      include: { enrollments: true },
    });

    if (!dbUser) throw new Error('Student record was not created in PostgreSQL');
    if (dbUser.name !== 'Integration Test Student') throw new Error('Name mismatch in DB');
    if (dbUser.program !== 'CSE') throw new Error('Program mismatch in DB');
    if (dbUser.classGroup !== 'CSE-A') throw new Error('ClassGroup mismatch in DB');
    if (dbUser.numberOfBacklogs !== 2) throw new Error(`Backlogs mismatch in DB: expected 2, got ${dbUser.numberOfBacklogs}`);
    if (!Array.isArray(dbUser.backlogSubjects) || dbUser.backlogSubjects.length !== 2) {
      throw new Error(`Backlog subjects mismatch in DB: ${JSON.stringify(dbUser.backlogSubjects)}`);
    }
    if (dbUser.batchStartYear !== 2024 || dbUser.batchEndYear !== 2028) {
      throw new Error(`Batch years mismatch: ${dbUser.batchStartYear}-${dbUser.batchEndYear}`);
    }
    if (dbUser.enrollments.length === 0) {
      throw new Error('StudentEnrollment record was not created in PostgreSQL transaction');
    }
    const enrollment = dbUser.enrollments[0];
    if (enrollment.semesterId !== semesterId || enrollment.classGroup !== 'CSE-A' || enrollment.program !== 'CSE') {
      throw new Error(`StudentEnrollment values mismatch: ${JSON.stringify(enrollment)}`);
    }
    console.log('✓ Individual student registration and DB transactional persistence verified!');

    // 2. Test Duplicate Student Registration Rejection (409 Conflict)
    console.log('\nStep 2: Testing duplicate student registration rejection...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(registerPayload),
    });
    const dupData = await dupRes.json();
    console.log(`Duplicate registration status: ${dupRes.status}`, dupData.error);
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate USN but got ${dupRes.status}`);
    }
    console.log('✓ Duplicate registration prevention verified!');

    // 3. Test Student Update via PATCH /api/auth/users/:id
    console.log('\nStep 3: Updating student via PATCH /api/auth/users/:id...');
    const updatePayload = {
      name: 'Integration Test Student Updated',
      classGroup: 'CSE-B',
      numberOfBacklogs: 1,
      backlogSubjects: ['24CS101'],
    };

    const updateRes = await fetch(`${baseUrl}/auth/users/${dbUser.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(updatePayload),
    });
    const updateData = await updateRes.json();
    console.log(`Update status: ${updateRes.status}`, updateData.message || updateData.error);
    if (updateRes.status !== 200) {
      throw new Error(`Expected 200 OK for update but got ${updateRes.status}: ${JSON.stringify(updateData)}`);
    }

    // Verify PostgreSQL persistence & enrollment synchronization
    const updatedDbUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      include: { enrollments: true },
    });
    if (!updatedDbUser) throw new Error('User missing after update');
    if (updatedDbUser.name !== 'Integration Test Student Updated') throw new Error('Name not updated');
    if (updatedDbUser.classGroup !== 'CSE-B') throw new Error('ClassGroup not updated on User');
    if (updatedDbUser.numberOfBacklogs !== 1) throw new Error('Backlogs count not updated');
    if (updatedDbUser.enrollments[0].classGroup !== 'CSE-B') {
      throw new Error(`ClassGroup was NOT synchronized to StudentEnrollment: ${updatedDbUser.enrollments[0].classGroup}`);
    }
    console.log('✓ Student update and StudentEnrollment sync verified!');

    // 4. Test Student List Retrieval (GET /api/auth/users?role=student)
    console.log('\nStep 4: Fetching students list...');
    const listRes = await fetch(`${baseUrl}/auth/users?role=student`, {
      headers: authHeaders,
    });
    const listData = await listRes.json();
    if (listRes.status !== 200 || !Array.isArray(listData)) {
      throw new Error(`Expected 200 OK array for user list: ${listRes.status}`);
    }
    const found = listData.find((u: any) => u.id === dbUser.id || u.email?.toLowerCase() === testUsn.toLowerCase());
    if (!found) throw new Error('Created student not found in user list query');
    if (found.numberOfBacklogs !== 1) throw new Error('Backlogs count missing or incorrect in list query');
    if (!found.enrollments || found.enrollments.length === 0) throw new Error('Enrollments missing in list query');
    console.log('✓ Student list query verified!');

    // 5. Test Student Deletion Cleanup (DELETE /api/auth/users/:id)
    console.log('\nStep 5: Deleting test student...');
    await prisma.studentEnrollment.deleteMany({ where: { studentId: dbUser.id } });
    const delRes = await fetch(`${baseUrl}/auth/users/${dbUser.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const delData = await delRes.json();
    console.log(`Delete status: ${delRes.status}`, delData.message || delData.error);
    if (delRes.status !== 200) {
      throw new Error(`Expected 200 OK for delete: ${JSON.stringify(delData)}`);
    }

    const checkDeleted = await prisma.user.findUnique({ where: { id: dbUser.id } });
    if (checkDeleted) throw new Error('Student was not removed from DB');
    console.log('✓ Student deletion verified!');

    console.log('\n========================================');
    console.log('ALL STUDENT MANAGEMENT TESTS PASSED!');
    console.log('========================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runStudentManagementIntegrationTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
