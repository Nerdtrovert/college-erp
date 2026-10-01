import { PrismaClient, Role, SemesterStatus, SubjectType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { currentStudents } from './current-students';
import { batchYearsFromUsn, semesterNumberFromUsn } from '../src/constants/program';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const deanPasswordHash = await bcrypt.hash('dean123', 10);
  const hodPasswordHash = await bcrypt.hash('hod123', 10);
  const principalPasswordHash = await bcrypt.hash('principal123', 10);

  const defaultSemester = await prisma.semester.upsert({
    where: { id: 'sem1' },
    update: { name: 'Odd sem 2026-27' },
    create: {
      id: 'sem1',
      name: 'Odd sem 2026-27',
      startDate: '2026-08-01',
      endDate: '2026-12-20',
      status: SemesterStatus.ACTIVE,
    },
  });
  console.log('Default semester seeded.');

  // Faculty Data
  const facultyData = [
    { id: 'madhumathi@hnnce.in', name: 'Prof. Madhumathi', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'vijaya@hnnce.in', name: 'Prof. Vijaya Singh', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'nagasundara@hnnce.in', name: 'Dr. Nagasundara K B', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'bhargavi@hnnce.in', name: 'Dr. Bhargavi K S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'rajesh@hnnce.in', name: 'Prof. Rajesh M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'praveen@hnnce.in', name: 'Dr. Praveen Kumar B C', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'harshitha@hnnce.in', name: 'Prof. Harshitha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'sunil@hnnce.in', name: 'Prof. Sunil Kumar S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'madhimatha@hnnce.in', name: 'Prof. Madhimatha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { id: 'lashmi@hnnce.in', name: 'Prof. Lashmi A M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },

    // Admins
    { id: 'deanCSE@hnnce.in', name: 'Dr. Dean Administrator', password: deanPasswordHash, role: Role.dean, department: 'Administration' },
    { id: 'hodCSE@hnnce.com', name: 'Dr Anirudh Sharma', password: hodPasswordHash, role: Role.hod, department: 'Dept of CSE' },
    { id: 'shwetha@hnnce.in', name: 'Dr. Shwetha V', password: hodPasswordHash, role: Role.hod, department: 'EC' },
    { id: 'jayadevappa@hnnce.in', name: 'Dr. D Jayadevappa', password: principalPasswordHash, role: Role.principal, department: 'Administration' },
  ];

  for (const f of facultyData) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: { name: f.name, password: f.password, role: f.role, department: f.department },
      create: f,
    });
  }
  console.log('Faculty seeded.');

  // Current roster from the 09.07.2026 seating list. Semester numbers are
  // derived from each USN cohort and the academic period start date.
  // Replacing all student rows removes the old demo students and stale names.
  await prisma.user.deleteMany({ where: { role: Role.student } });
  await prisma.user.createMany({
    data: currentStudents.map((student) => ({
      id: student.id,
      name: student.name,
      password: studentPasswordHash,
      role: Role.student,
      isActive: true,
      batchStartYear: batchYearsFromUsn(student.id)?.startYear,
      batchEndYear: batchYearsFromUsn(student.id)?.endYear,
      department: null,
      program: student.program,
      classGroup: student.classGroup,
      semesterId: defaultSemester.id,
    })),
  });
  await prisma.studentEnrollment.createMany({
    data: currentStudents.map((student) => ({
      studentId: student.id,
      semesterId: defaultSemester.id,
      semesterNumber: semesterNumberFromUsn(student.id, defaultSemester.startDate!)!,
      program: student.program,
      classGroup: student.classGroup,
    })),
  });
  console.log('Students seeded.');

  // Subjects Data
  // Using -A and -B suffixes for the DB primary key, but UI could be adapted later.
  const subjects = [
    // CSE-A Subjects
    { code: 'BCS501-A', name: 'Software Engineering & PM', facultyId: 'madhumathi@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCS502-A', name: 'Computer Networks (Theory)', facultyId: 'vijaya@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCS503-A', name: 'Theory of Computation', facultyId: 'nagasundara@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BRMK557-A', name: 'Research Methodology and IPR', facultyId: 'bhargavi@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCS515B-A', name: 'Artificial Intelligence', facultyId: 'rajesh@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCS508-A', name: 'Env Studies & E-Waste Mgmt', facultyId: 'praveen@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCS502L-A', name: 'Computer Networks (Lab)', facultyId: 'vijaya@hnnce.in', coFacultyId: 'harshitha@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BCSL504-A', name: 'Web Technology Lab', facultyId: 'sunil@hnnce.in', coFacultyId: 'madhimatha@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'BIS586-A', name: 'Mini Project', facultyId: 'nagasundara@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },
    { code: 'MC-A', name: 'NSS/PE/Yoga', facultyId: 'praveen@hnnce.in', classGroup: 'CSE-A', type: SubjectType.STANDALONE },

    // CSE-B Subjects
    { code: 'BCS501-B', name: 'Software Engineering & PM', facultyId: 'madhumathi@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCS502-B', name: 'Computer Networks (Theory)', facultyId: 'vijaya@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCS503-B', name: 'Theory of Computation', facultyId: 'nagasundara@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BRMK557-B', name: 'Research Methodology and IPR', facultyId: 'lashmi@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCS515B-B', name: 'Artificial Intelligence', facultyId: 'rajesh@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCS508-B', name: 'Env Studies & E-Waste Mgmt', facultyId: 'praveen@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCS502L-B', name: 'Computer Networks (Lab)', facultyId: 'vijaya@hnnce.in', coFacultyId: 'harshitha@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BCSL504-B', name: 'Web Technology Lab', facultyId: 'sunil@hnnce.in', coFacultyId: 'madhimatha@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'BIS586-B', name: 'Mini Project', facultyId: 'nagasundara@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    { code: 'MC-B', name: 'NSS/PE/Yoga', facultyId: 'praveen@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, facultyId: s.facultyId, coFacultyId: s.coFacultyId, classGroup: s.classGroup, type: s.type },
      create: s,
    });
  }
  console.log('Subjects seeded.');

  // Timetable Data
  const timetable = [
    // CSE-A Timetable (Room B 006)
    // Monday
    { day: 'Monday', slotIndex: 0, subjectCode: 'BRMK557-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'bhargavi@hnnce.in' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'BCS501-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Monday', slotIndex: 3, subjectCode: 'BCS503-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Monday', slotIndex: 4, subjectCode: 'BCS503-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' },

    // Tuesday
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'BCS502-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'vijaya@hnnce.in' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'BCS508-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'praveen@hnnce.in' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS501-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS515B-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'rajesh@hnnce.in' },
    { day: 'Tuesday', slotIndex: 6, subjectCode: 'BCS503-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' }, // TUTO
    { day: 'Tuesday', slotIndex: 7, subjectCode: 'BCS503-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' }, // TUTO

    // Wednesday
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BCS502L-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BCS502L-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BCS502-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'vijaya@hnnce.in' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS508-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'praveen@hnnce.in' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCSL504-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCSL504-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },

    // Thursday
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BRMK557-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'bhargavi@hnnce.in' }, // TUTO
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BRMK557-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'bhargavi@hnnce.in' }, // TUTO
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS503-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS502-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'vijaya@hnnce.in' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BIS586-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BIS586-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'nagasundara@hnnce.in' },

    // Friday
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS501-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS515B-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'rajesh@hnnce.in' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BRMK557-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'bhargavi@hnnce.in' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS515B-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'rajesh@hnnce.in' },
    { day: 'Friday', slotIndex: 6, subjectCode: 'MC-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'praveen@hnnce.in' },
    { day: 'Friday', slotIndex: 7, subjectCode: 'MC-A', room: 'B 006', classGroup: 'CSE-A', teacherId: 'praveen@hnnce.in' },

    // CSE-B Timetable (Room B 001)
    // Monday
    { day: 'Monday', slotIndex: 0, subjectCode: 'BCS502-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'vijaya@hnnce.in' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'BCS515B-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'rajesh@hnnce.in' },
    { day: 'Monday', slotIndex: 3, subjectCode: 'BCS508-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'praveen@hnnce.in' },
    { day: 'Monday', slotIndex: 4, subjectCode: 'BRMK557-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'lashmi@hnnce.in' },
    { day: 'Monday', slotIndex: 6, subjectCode: 'BCS503-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' }, // TUTO
    { day: 'Monday', slotIndex: 7, subjectCode: 'BCS503-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' }, // TUTO

    // Tuesday
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'BRMK557-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'lashmi@hnnce.in' }, // TUTO
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'BRMK557-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'lashmi@hnnce.in' }, // TUTO
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS515B-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'rajesh@hnnce.in' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS508-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'praveen@hnnce.in' },

    // Wednesday
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BIS586-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BIS586-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BRMK557-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'lashmi@hnnce.in' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS501-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCS502L-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCS502L-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in' },

    // Thursday
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BCS501-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BCS515B-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'rajesh@hnnce.in' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS502-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'vijaya@hnnce.in' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS503-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BCSL504-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BCSL504-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in' },

    // Friday
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS503-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS503-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'nagasundara@hnnce.in' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BCS501-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'madhumathi@hnnce.in' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS502-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'vijaya@hnnce.in' },
    { day: 'Friday', slotIndex: 6, subjectCode: 'MC-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'praveen@hnnce.in' },
    { day: 'Friday', slotIndex: 7, subjectCode: 'MC-B', room: 'B 001', classGroup: 'CSE-B', teacherId: 'praveen@hnnce.in' },
  ];

  for (const t of timetable) {
    await prisma.timetableSlot.upsert({
      where: {
        classGroup_day_slotIndex_semesterId: {
          classGroup: t.classGroup,
          day: t.day,
          slotIndex: t.slotIndex,
          semesterId: defaultSemester.id,
        },
      },
      update: {
        subjectCode: t.subjectCode,
        room: t.room,
        teacherId: t.teacherId,
        coTeacherId: (t as any).coTeacherId || null,
      },
      create: {
        day: t.day,
        slotIndex: t.slotIndex,
        subjectCode: t.subjectCode,
        room: t.room,
        classGroup: t.classGroup,
        teacherId: t.teacherId,
        coTeacherId: (t as any).coTeacherId || null,
        semesterId: defaultSemester.id,
      },
    });
  }
  console.log('Timetables seeded.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
