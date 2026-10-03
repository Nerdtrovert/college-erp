import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const demoStudentId = '1HC24CS999';
const demoStudentName = 'DEMO BACKLOG STUDENT';
const demoBacklogSubjects = ['BCS501-B', 'BCS503-B'];

async function main() {
  if (process.argv.includes('--delete')) {
    const demoStudent = await prisma.user.findUnique({ where: { id: demoStudentId } });
    if (!demoStudent) {
      console.log(`No backlog demo student found for ${demoStudentId}; nothing to delete.`);
      return;
    }
    if (
      demoStudent.name !== demoStudentName
      || demoStudent.role !== Role.student
      || demoStudent.classGroup !== 'CSE-B'
      || demoStudent.program !== 'CSE'
    ) {
      throw new Error(`Refusing to delete ${demoStudentId}: it does not match the expected demo student.`);
    }

    await prisma.studentEnrollment.deleteMany({ where: { studentId: demoStudentId } });
    await prisma.user.delete({ where: { id: demoStudentId } });
    console.log(`Deleted backlog demo student ${demoStudentName} (${demoStudentId}) and its enrollments.`);
    return;
  }

  const existingStudent = await prisma.user.findUnique({ where: { id: demoStudentId } });
  if (existingStudent && existingStudent.name !== demoStudentName) {
    throw new Error(`Cannot create demo student: ${demoStudentId} already belongs to another user.`);
  }

  const activeSemester = await prisma.semester.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeSemester) {
    throw new Error('Create or activate an academic semester before adding the backlog demo student.');
  }

  const subjects = await prisma.subject.findMany({
    where: { code: { in: demoBacklogSubjects }, classGroup: 'CSE-B' },
    select: { code: true },
  });
  const foundCodes = new Set(subjects.map((subject) => subject.code));
  const missingCodes = demoBacklogSubjects.filter((code) => !foundCodes.has(code));
  if (missingCodes.length > 0) {
    throw new Error(`Missing CSE-B demo subjects: ${missingCodes.join(', ')}. Seed the course catalog first.`);
  }

  const password = await bcrypt.hash('student123', 10);
  await prisma.user.upsert({
    where: { id: demoStudentId },
    update: {
      name: demoStudentName,
      password,
      role: Role.student,
      isActive: true,
      batchStartYear: 2024,
      batchEndYear: 2028,
      program: 'CSE',
      classGroup: 'CSE-B',
      semesterId: activeSemester.id,
      numberOfBacklogs: demoBacklogSubjects.length,
      backlogSubjects: demoBacklogSubjects,
    },
    create: {
      id: demoStudentId,
      name: demoStudentName,
      password,
      role: Role.student,
      isActive: true,
      batchStartYear: 2024,
      batchEndYear: 2028,
      program: 'CSE',
      classGroup: 'CSE-B',
      semesterId: activeSemester.id,
      numberOfBacklogs: demoBacklogSubjects.length,
      backlogSubjects: demoBacklogSubjects,
    },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_semesterId: {
        studentId: demoStudentId,
        semesterId: activeSemester.id,
      },
    },
    update: {
      semesterNumber: 5,
      program: 'CSE',
      classGroup: 'CSE-B',
    },
    create: {
      studentId: demoStudentId,
      semesterId: activeSemester.id,
      semesterNumber: 5,
      program: 'CSE',
      classGroup: 'CSE-B',
    },
  });

  console.log(`Created ${demoStudentName} (${demoStudentId}) in ${activeSemester.name}.`);
  console.log(`Backlogs: ${demoBacklogSubjects.join(', ')}. Student login password: student123.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed backlog demo student:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
