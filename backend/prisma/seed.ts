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

  // Subjects Data - CANONICAL SUBJECTS ONLY (no section suffixes)
  // First, define all canonical subjects
  const canonicalSubjects = [
    // Standalone Subjects
    { code: 'BCS501', name: 'Software Engineering & PM', type: SubjectType.STANDALONE },
    { code: 'BCS503', name: 'Theory of Computation', type: SubjectType.STANDALONE },
    { code: 'BRMK557', name: 'Research Methodology and IPR', type: SubjectType.STANDALONE },
    { code: 'BCS515B', name: 'Artificial Intelligence', type: SubjectType.STANDALONE },
    { code: 'BCS508', name: 'Env Studies & E-Waste Mgmt', type: SubjectType.STANDALONE },
    { code: 'BCSL504', name: 'Web Technology Lab', type: SubjectType.STANDALONE }, // Note: This is already a lab subject
    { code: 'BIS586', name: 'Mini Project', type: SubjectType.STANDALONE },
    { code: 'MC', name: 'NSS/PE/Yoga', type: SubjectType.STANDALONE },

    // Integrated Subjects (theory + lab pairs)
    { code: 'BCS502', name: 'Computer Networks', type: SubjectType.INTEGRATED }, // Combines BCS502-A/B (theory) and BCS502L-A/B (lab)
  ];

  // Create canonical subjects
  for (const s of canonicalSubjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type },
      create: s,
    });
  }
  console.log('Canonical subjects seeded.');

  // Subject Section Assignments
  // Map of subject code to its sections and faculty assignments
  // Format: subjectCode -> { classGroup: { theoryFacultyId, labFacultyId } }
  const subjectAssignments = {
    BCS501: {
      'CSE-A': { theoryFacultyId: 'madhumathi@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'madhumathi@hnnce.in', labFacultyId: null },
    },
    BCS502: {
      'CSE-A': { theoryFacultyId: 'vijaya@hnnce.in', labFacultyId: 'harshitha@hnnce.in' },
      'CSE-B': { theoryFacultyId: 'vijaya@hnnce.in', labFacultyId: 'harshitha@hnnce.in' },
    },
    BCS503: {
      'CSE-A': { theoryFacultyId: 'nagasundara@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'nagasundara@hnnce.in', labFacultyId: null },
    },
    BRMK557: {
      'CSE-A': { theoryFacultyId: 'bhargavi@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'lashmi@hnnce.in', labFacultyId: null },
    },
    BCS515B: {
      'CSE-A': { theoryFacultyId: 'rajesh@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'rajesh@hnnce.in', labFacultyId: null },
    },
    BCS508: {
      'CSE-A': { theoryFacultyId: 'praveen@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'praveen@hnnce.in', labFacultyId: null },
    },
    BCSL504: {
      'CSE-A': { theoryFacultyId: 'sunil@hnnce.in', labFacultyId: 'madhimatha@hnnce.in' },
      'CSE-B': { theoryFacultyId: 'sunil@hnnce.in', labFacultyId: 'madhimatha@hnnce.in' },
    },
    BIS586: {
      'CSE-A': { theoryFacultyId: 'nagasundara@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'nagasundara@hnnce.in', labFacultyId: null },
    },
    MC: {
      'CSE-A': { theoryFacultyId: 'praveen@hnnce.in', labFacultyId: null },
      'CSE-B': { theoryFacultyId: 'praveen@hnnce.in', labFacultyId: null },
    },
  };

  // Create SubjectSectionAssignment records
  const assignmentRecords = [];
  for (const [subjectCode, sections] of Object.entries(subjectAssignments)) {
    for (const [classGroup, facultyIds] of Object.entries(sections)) {
      // Find the subject to get its ID
      const subject = await prisma.subject.findUnique({
        where: { code: subjectCode },
      });

      if (subject) {
        assignmentRecords.push({
          id: `${subjectCode}-${classGroup}`, // Deterministic ID based on subject and class
          subjectId: subject.id,
          classGroup,
          theoryFacultyId: facultyIds.theoryFacultyId,
          labFacultyId: facultyIds.labFacultyId,
        });
      }
    }
  }

  // Upsert assignments
  for (const assignment of assignmentRecords) {
    await prisma.subjectSectionAssignment.upsert({
      where: { id: assignment.id },
      update: {
        subjectId: assignment.subjectId,
        classGroup: assignment.classGroup,
        theoryFacultyId: assignment.theoryFacultyId,
        labFacultyId: assignment.labFacultyId,
      },
      create: assignment,
    });
  }
  console.log('Subject section assignments seeded.');

  // Timetable Data - NEW MODEL USING assignmentId
  // First, let's create a mapping from (subjectCode, classGroup) to assignmentId
  const assignmentMap = new Map();
  for (const assignment of assignmentRecords) {
    const key = `${assignment.classGroup}-${assignment.subjectId}`;
    assignmentMap.set(key, assignment.id);
  }

  const timetable = [
    { day: 'Monday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 3, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 4, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'BCS508', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 6, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Tuesday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'B 006', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'B 006', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 6, subjectCode: 'MC', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in', activityType: 'PRACTICAL' },
    { day: 'Friday', slotIndex: 7, subjectCode: 'MC', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in', activityType: 'PRACTICAL' },
    { day: 'Monday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 3, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 4, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 6, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Monday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'B 001', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'B 001', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 6, subjectCode: 'MC', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'PRACTICAL' },
    { day: 'Friday', slotIndex: 7, subjectCode: 'MC', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'PRACTICAL' }
  ];
  // Create timetable slots using assignmentId
  for (const t of timetable) {
    // Find the assignment for this subject and class group
    const assignmentKey = `${t.classGroup}-${t.subjectCode}`;
    const assignmentId = assignmentMap.get(assignmentKey);

    if (assignmentId) {
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
          assignmentId,
          room: t.room,
          teacherId: t.teacherId,
          coTeacherId: (t as any).coTeacherId || null,
        },
        create: {
          day: t.day,
          slotIndex: t.slotIndex,
          assignmentId,
          room: t.room,
          classGroup: t.classGroup,
          teacherId: t.teacherId,
          coTeacherId: (t as any).coTeacherId || null,
          semesterId: defaultSemester.id,
          activityType: t.activityType || undefined, // This will be inferred from subject data if needed
        },
      });
    } else {
      console.warn(`No assignment found for ${t.subjectCode} in classGroup ${t.classGroup}`);
    }
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