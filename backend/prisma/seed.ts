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
    where: { code: 'sem1' },
    update: { name: 'Odd sem 2026-27' },
    create: {
      code: 'sem1',
      name: 'Odd sem 2026-27',
      startDate: '2026-08-01',
      endDate: '2026-12-20',
      status: SemesterStatus.ACTIVE,
    },
  });
  console.log('Default semester seeded.');

  // Faculty Data
  const facultyData = [
    { email: 'madhumathi@hnnce.in', name: 'Prof. Madhumathi', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'vijaya@hnnce.in', name: 'Prof. Vijaya Singh', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'nagasundara@hnnce.in', name: 'Dr. Nagasundara K B', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'bhargavi@hnnce.in', name: 'Dr. Bhargavi K S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'rajesh@hnnce.in', name: 'Prof. Rajesh M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'praveen@hnnce.in', name: 'Dr. Praveen Kumar B C', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'harshitha@hnnce.in', name: 'Prof. Harshitha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'sunil@hnnce.in', name: 'Prof. Sunil Kumar S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'madhimatha@hnnce.in', name: 'Prof. Madhimatha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'lashmi@hnnce.in', name: 'Prof. Lashmi A M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'archana.bk@hnnce.in', name: 'Prof. Archana B K', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'sadashiva@hnnce.in', name: 'Dr. Sadashiva V C', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'archana.s@hnnce.in', name: 'Prof. Archana S', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'ranjan@hnnce.in', name: 'Dr. B S C Ranjan', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'lakshmi@hnnce.in', name: 'Prof. Lakshmi A N', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'megashree@hnnce.in', name: 'Prof. Megashree', password: teacherPasswordHash, role: Role.teacher, department: 'ISE' },

    // Admins
    { email: 'deanCSE@hnnce.in', name: 'Dr. Dean Administrator', password: deanPasswordHash, role: Role.dean, department: 'Administration' },
    { email: 'hodCSE@hnnce.com', name: 'Dr Anirudh Sharma', password: hodPasswordHash, role: Role.hod, department: 'Dept of CSE' },
    { email: 'shwetha@hnnce.in', name: 'Dr. Shwetha V', password: hodPasswordHash, role: Role.hod, department: 'EC' },
    { email: 'jayadevappa@hnnce.in', name: 'Dr. D Jayadevappa', password: principalPasswordHash, role: Role.principal, department: 'Administration' },
  ];

  // Create faculty records and build email-to-id lookup map
  const facultyEmailToIdMap = new Map<string, string>();
  for (const f of facultyData) {
    const email = f.email.toLowerCase();
    console.log(`Processing faculty: ${f.name} (email: ${email})`);
    // Check if user with this email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { name: f.name }],
      },
    });

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          name: f.name,
          password: f.password,
          role: f.role,
          department: f.department
        }
      });
      console.log(`Updated faculty: ${f.name} with ID: ${user.id}`);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: f.name,
          password: f.password,
          role: f.role,
          department: f.department
          // id will be auto-generated as UUID due to @db.Uoid
        }
      });
      console.log(`Created faculty: ${f.name} with ID: ${user.id}`);
    }
    // Build mapping from email to actual user ID (UUID)
    facultyEmailToIdMap.set(email, user.id);
  }
  console.log('Faculty seeded and email-to-ID map built.');


// Upsert students based on email (USN)
const studentUsers = [];
for (const student of currentStudents) {
  const email = student.id.toLowerCase();
  const existingStudent = await prisma.user.findUnique({
    where: { email },
  });
  const studentData = {
    email,
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
  };
  let studentUser;
  if (existingStudent) {
    studentUser = await prisma.user.update({
      where: { email },
      data: studentData,
    });
  } else {
    studentUser = await prisma.user.create({
      data: studentData,
    });
  }
  studentUsers.push(studentUser);
}
console.log("Students seeded.");

// Map classGroup to batchYear from student data
const classGroupBatchYearMap = new Map<string, number>();
for (const student of currentStudents) {
  const batchYearInfo = batchYearsFromUsn(student.id);
  if (batchYearInfo) {
    classGroupBatchYearMap.set(student.classGroup, batchYearInfo.startYear);
  }
}

// Get the actual student users with their generated UUID IDs (we already have them in studentUsers, but we need to map by email for enrollment)
const studentEmailToIdMap = new Map<string, string>();
for (const su of studentUsers) {
  studentEmailToIdMap.set(su.email ?? '', su.id);
}

// Upsert enrollments for each student
for (const student of currentStudents) {
  const studentId = studentEmailToIdMap.get(student.id.toLowerCase());
  if (!studentId) {
    throw new Error(`Could not find student user for USN: ${student.id}`);
  }
  await prisma.studentEnrollment.upsert({
    where: {
      studentId_semesterId: {
        studentId,
        semesterId: defaultSemester.id,
      },
    },
    update: {
      semesterNumber: semesterNumberFromUsn(student.id, defaultSemester.startDate!)!,
      program: student.program,
      classGroup: student.classGroup,
    },
    create: {
      studentId,
      semesterId: defaultSemester.id,
      semesterNumber: semesterNumberFromUsn(student.id, defaultSemester.startDate!)!,
      program: student.program,
      classGroup: student.classGroup,
    },
  });
}

// Delete enrollments for the default semester that are not for the current students
const currentStudentEmails = currentStudents.map(s => s.id.toLowerCase());
const currentStudentIds = await prisma.user.findMany({
  where: {
    email: {
      in: currentStudentEmails
    }
  },
  select: { id: true }
}).then(ids => ids.map(i => i.id));

await prisma.studentEnrollment.deleteMany({
  where: {
    semesterId: defaultSemester.id,
    studentId: {
      notIn: currentStudentIds
    }
  }
});

  

  // Subjects Data - CANONICAL SUBJECTS ONLY (no section suffixes)
  // First, define all canonical subjects
  const canonicalSubjects = [
    // Standalone Subjects
    { code: 'BCS501', name: 'Software Engineering & PM', type: SubjectType.STANDALONE },
    { code: 'BCS503', name: 'Theory of Computation', type: SubjectType.STANDALONE },
    { code: 'BRMK557', name: 'Research Methodology and IPR', type: SubjectType.STANDALONE },
    { code: 'BRM557', name: 'Research Methodology', type: SubjectType.STANDALONE },
    { code: 'BCS515B', name: 'Artificial Intelligence', type: SubjectType.STANDALONE },
    { code: 'BCS508', name: 'Env Studies & E-Waste Mgmt', type: SubjectType.STANDALONE },
    { code: 'BCSL504', name: 'Web Technology Lab', type: SubjectType.STANDALONE }, // Note: This is already a lab subject
    { code: 'BIS586', name: 'Mini Project', type: SubjectType.STANDALONE },
    { code: 'BEC501', name: 'Python Programming and Technological Innovation Management', type: SubjectType.STANDALONE },
    { code: 'BEC502', name: 'Digital Signal Processing', type: SubjectType.INTEGRATED },
    { code: 'BEC503', name: 'Digital Communication', type: SubjectType.STANDALONE },
    { code: 'BEC515D', name: 'Satellite and Optical Communication', type: SubjectType.STANDALONE },
    { code: 'BECL504', name: 'Digital Communication Lab', type: SubjectType.STANDALONE },
    { code: 'BESK508', name: 'Environmental Studies', type: SubjectType.STANDALONE },
    { code: 'BAIL504', name: 'Unspecified course (ISE timetable)', type: SubjectType.STANDALONE },
    { code: 'BNSK559', name: 'Course name not specified in source (BNSK559)', type: SubjectType.STANDALONE },
    { code: 'BPEK559', name: 'Course name not specified in source (BPEK559)', type: SubjectType.STANDALONE },
    { code: 'BYOK559', name: 'Course name not specified in source (BYOK559)', type: SubjectType.STANDALONE },

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
  // Map of subject code to its sections and faculty assignments (by name)
  // Format: subjectCode -> { classGroup: { theoryFacultyIdName, labFacultyIdName } }
  const subjectAssignments = {
    BCS501: {
      'CSE-A': { theoryFacultyIdName: 'Prof. Madhumathi', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Prof. Madhumathi', labFacultyIdName: null },
      ISE: { theoryFacultyIdName: 'Prof. Harshitha', labFacultyIdName: null },
    },
    BCS502: {
      'CSE-A': { theoryFacultyIdName: 'Prof. Vijaya Singh', labFacultyIdName: 'Prof. Harshitha' },
      'CSE-B': { theoryFacultyIdName: 'Prof. Vijaya Singh', labFacultyIdName: 'Prof. Harshitha' },
      ISE: { theoryFacultyIdName: 'Prof. Harshitha', labFacultyIdName: 'Prof. Harshitha' },
    },
    BCS503: {
      'CSE-A': { theoryFacultyIdName: null, labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: null, labFacultyIdName: null },
      ISE: { theoryFacultyIdName: 'Dr. Nagasundara K B', labFacultyIdName: null },
    },
    BRMK557: {
      'CSE-A': { theoryFacultyIdName: 'Dr. Bhargavi K S', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Prof. Lashmi A M', labFacultyIdName: null },
      ECE: { theoryFacultyIdName: null, labFacultyIdName: null },
      ISE: { theoryFacultyIdName: 'Prof. Megashree', labFacultyIdName: null },
    },
    BCS515B: {
      'CSE-A': { theoryFacultyIdName: 'Prof. Rajesh M', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Prof. Rajesh M', labFacultyIdName: null },
      ISE: { theoryFacultyIdName: 'Prof. Rajesh M', labFacultyIdName: null },
    },
    BCS508: {
      'CSE-A': { theoryFacultyIdName: 'Dr. Praveen Kumar B C', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Dr. Praveen Kumar B C', labFacultyIdName: null },
      ISE: { theoryFacultyIdName: null, labFacultyIdName: null },
    },
    BCSL504: {
      'CSE-A': { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Sunil Kumar S' },
      'CSE-B': { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Sunil Kumar S' },
      ISE: { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Sunil Kumar S' },
    },
    BIS586: {
      'CSE-A': { theoryFacultyIdName: null, labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: null, labFacultyIdName: null },
      ISE: { theoryFacultyIdName: null, labFacultyIdName: null },
      ECE: { theoryFacultyIdName: null, labFacultyIdName: null },
    },
    BEC501: { ECE: { theoryFacultyIdName: 'Dr. D Jayadevappa', labFacultyIdName: null } },
    BEC502: { ECE: { theoryFacultyIdName: 'Dr. Sadashiva V C', labFacultyIdName: 'Dr. Sadashiva V C' } },
    BEC503: { ECE: { theoryFacultyIdName: 'Prof. Archana B K', labFacultyIdName: null } },
    BEC515D: { ECE: { theoryFacultyIdName: 'Dr. Shwetha V', labFacultyIdName: null } },
    BECL504: { ECE: { theoryFacultyIdName: null, labFacultyIdName: null } },
    BESK508: { ECE: { theoryFacultyIdName: 'Prof. Lakshmi A N', labFacultyIdName: null } },
    BRM557: { ECE: { theoryFacultyIdName: 'Dr. B S C Ranjan', labFacultyIdName: null } },
    BNSK559: { ECE: { theoryFacultyIdName: null, labFacultyIdName: null } },
    BPEK559: { ECE: { theoryFacultyIdName: null, labFacultyIdName: null } },
    BYOK559: { ECE: { theoryFacultyIdName: null, labFacultyIdName: null } },
    BAIL504: { ISE: { theoryFacultyIdName: null, labFacultyIdName: null } },
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
        // Look up faculty IDs by converting names to emails and using email-to-id map
        const getFacultyIdByName = (name: string | null): string | null => {
          if (!name) return null;
          const person = facultyData.find(item => item.name.toLowerCase() === name.toLowerCase());
          return person ? facultyEmailToIdMap.get(person.email.toLowerCase()) || null : null;
        };

        const theoryFacultyId = getFacultyIdByName(facultyIds.theoryFacultyIdName);
        const labFacultyId = getFacultyIdByName(facultyIds.labFacultyIdName);

        // Debug logging
        console.log(`Creating assignment for ${subjectCode}-${classGroup}:`);
        console.log(`  theoryFacultyIdName: ${facultyIds.theoryFacultyIdName}`);
        console.log(`  theoryFacultyId (from email map): ${theoryFacultyId}`);
        console.log(`  labFacultyIdName: ${facultyIds.labFacultyIdName}`);
        console.log(`  labFacultyId (from email map): ${labFacultyId}`);

        // Debug logging
        console.log(`Attempting to create SubjectSectionAssignment:`);
        console.log(`  subjectId: ${subject.id} (type: ${typeof subject.id})`);
        console.log(`  classGroup: ${classGroup}`);
        console.log(`  theoryFacultyId: ${theoryFacultyId} (type: ${typeof theoryFacultyId})`);
        console.log(`  labFacultyId: ${labFacultyId} (type: ${typeof labFacultyId})`);

        const assignment = await prisma.subjectSectionAssignment.upsert({
          where: { subjectId_classGroup: { subjectId: subject.id, classGroup } },
          update: { theoryFacultyId, labFacultyId },
          create: {
            subjectId: subject.id,
            classGroup: classGroup,
            theoryFacultyId: theoryFacultyId,
            labFacultyId: labFacultyId,
          },
        });
        assignmentRecords.push(assignment);
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
    { day: 'Tuesday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'Lab3', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'Lab3', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-A', room: 'B 006', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'Lab2', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-A', room: 'Lab2', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BCS503', classGroup: 'CSE-A', room: 'B 006', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-A', room: 'B 006', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: '', activityType: 'PROJECT' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BIS586', classGroup: 'CSE-A', room: 'B 006', teacherId: '', activityType: 'PROJECT' },
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-A', room: 'B 006', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-A', room: 'B 006', teacherId: 'bhargavi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS515B', classGroup: 'CSE-A', room: 'B 006', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 6, subjectCode: '__NCMC__', classGroup: 'CSE-A', room: 'B 006', teacherId: '', activityType: 'NCMC' },
    { day: 'Friday', slotIndex: 7, subjectCode: '__NCMC__', classGroup: 'CSE-A', room: 'B 006', teacherId: '', activityType: 'NCMC' },
    { day: 'Monday', slotIndex: 0, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 3, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 4, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Monday', slotIndex: 6, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Monday', slotIndex: 7, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'BCS515B', classGroup: 'CSE-B', room: 'B 001', teacherId: 'rajesh@hnnce.in', activityType: 'THEORY' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: 'BCS508', classGroup: 'CSE-B', room: 'B 001', teacherId: 'praveen@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: '', activityType: 'PROJECT' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'BIS586', classGroup: 'CSE-B', room: 'B 001', teacherId: '', activityType: 'PROJECT' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 4, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Wednesday', slotIndex: 6, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'Lab3', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Wednesday', slotIndex: 7, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'Lab3', teacherId: 'vijaya@hnnce.in', coTeacherId: 'harshitha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 0, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Thursday', slotIndex: 4, subjectCode: 'BRMK557', classGroup: 'CSE-B', room: 'B 001', teacherId: 'lashmi@hnnce.in', activityType: 'TUTORIAL' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'Lab2', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'BCSL504', classGroup: 'CSE-B', room: 'Lab2', teacherId: 'sunil@hnnce.in', coTeacherId: 'madhimatha@hnnce.in', activityType: 'LAB' },
    { day: 'Friday', slotIndex: 0, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'BCS503', classGroup: 'CSE-B', room: 'B 001', teacherId: 'nagasundara@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'BCS501', classGroup: 'CSE-B', room: 'B 001', teacherId: 'madhumathi@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 4, subjectCode: 'BCS502', classGroup: 'CSE-B', room: 'B 001', teacherId: 'vijaya@hnnce.in', activityType: 'THEORY' },
    { day: 'Friday', slotIndex: 6, subjectCode: '__NCMC__', classGroup: 'CSE-B', room: 'B 001', teacherId: '', activityType: 'NCMC' },
    { day: 'Friday', slotIndex: 7, subjectCode: '__NCMC__', classGroup: 'CSE-B', room: 'B 001', teacherId: '', activityType: 'NCMC' }
  ];

  // Fifth semester schedules transcribed from EC.pdf and FifthSem-ISE.pdf.
  // Empty faculty cells are retained as unassigned rather than guessed.
  timetable.push(
    ...[
      // ECE, Room MB01
      ['Monday',0,'BEC503','archana.bk@hnnce.in','THEORY'], ['Monday',1,'BRMK557','','THEORY'], ['Monday',3,'BEC502','sadashiva@hnnce.in','THEORY'], ['Monday',4,'BEC503','archana.bk@hnnce.in','THEORY'], ['Monday',6,'BIS586','', 'PROJECT'], ['Monday',7,'BIS586','', 'PROJECT'],
      ['Tuesday',0,'BEC502','sadashiva@hnnce.in','LAB'], ['Tuesday',1,'BEC502','sadashiva@hnnce.in','LAB'], ['Tuesday',3,'BESK508','lakshmi@hnnce.in','THEORY'], ['Tuesday',4,'BEC502','sadashiva@hnnce.in','THEORY'], ['Tuesday',6,'BIS586','','PROJECT'], ['Tuesday',7,'BIS586','','PROJECT'],
      ['Wednesday',0,'BEC503','archana.bk@hnnce.in','THEORY'], ['Wednesday',1,'BEC515D','shwetha@hnnce.in','THEORY'], ['Wednesday',3,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Wednesday',4,'BESK508','lakshmi@hnnce.in','THEORY'], ['Wednesday',6,'BECL504','','LAB'], ['Wednesday',7,'BECL504','','LAB'],
      ['Thursday',0,'BRM557','ranjan@hnnce.in','THEORY'], ['Thursday',1,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Thursday',3,'BEC502','sadashiva@hnnce.in','THEORY'], ['Thursday',4,'BEC515D','shwetha@hnnce.in','THEORY'], ['Thursday',6,'BECL504','','LAB'], ['Thursday',7,'BECL504','','LAB'],
      ['Friday',0,'BEC515D','shwetha@hnnce.in','THEORY'], ['Friday',1,'BEC503','archana.bk@hnnce.in','THEORY'], ['Friday',3,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Friday',4,'BRM557','ranjan@hnnce.in','THEORY'], ['Friday',6,'__UNASSIGNED__','','UNASSIGNED'], ['Friday',7,'__UNASSIGNED__','','UNASSIGNED'],
      // ISE, Room MB 02
      ['Monday',0,'BCS502','vijaya@hnnce.in','LAB'], ['Monday',1,'BCS502','vijaya@hnnce.in','LAB'], ['Monday',3,'BCS502','harshitha@hnnce.in','THEORY'], ['Monday',4,'BRMK557','megashree@hnnce.in','THEORY'], ['Monday',6,'__NCMC__','','NCMC'], ['Monday',7,'__NCMC__','','NCMC'],
      ['Tuesday',0,'BAIL504','','THEORY'], ['Tuesday',1,'BAIL504','','THEORY'], ['Tuesday',3,'BCS501','harshitha@hnnce.in','THEORY'], ['Tuesday',4,'BCS502','harshitha@hnnce.in','THEORY'], ['Tuesday',6,'BCS515B','rajesh@hnnce.in','THEORY'], ['Tuesday',7,'BCS515B','rajesh@hnnce.in','THEORY'],
      ['Wednesday',0,'BCS501','harshitha@hnnce.in','THEORY'], ['Wednesday',1,'BCS508','','THEORY'], ['Wednesday',3,'BCS503','nagasundara@hnnce.in','THEORY'], ['Wednesday',4,'BCS502','harshitha@hnnce.in','THEORY'], ['Wednesday',6,'BCS503','nagasundara@hnnce.in','TUTORIAL'], ['Wednesday',7,'BCS503','nagasundara@hnnce.in','TUTORIAL'],
      ['Thursday',0,'BCS503','nagasundara@hnnce.in','THEORY'], ['Thursday',1,'BCS508','','THEORY'], ['Thursday',3,'BCS501','harshitha@hnnce.in','THEORY'], ['Thursday',4,'BRMK557','megashree@hnnce.in','THEORY'], ['Thursday',6,'BIS586','','PROJECT'], ['Thursday',7,'BIS586','','PROJECT'],
      ['Friday',0,'BCS515B','rajesh@hnnce.in','THEORY'], ['Friday',1,'BCS503','nagasundara@hnnce.in','THEORY'], ['Friday',3,'BRMK557','megashree@hnnce.in','TUTORIAL'], ['Friday',4,'BRMK557','megashree@hnnce.in','TUTORIAL'],
    ].map(([day, slotIndex, subjectCode, teacherId, activityType], index) => ({
      day: String(day), slotIndex: Number(slotIndex), subjectCode: String(subjectCode),
      classGroup: index < 30 ? 'ECE' : 'ISE',
      room: index < 30
        ? (String(subjectCode) === 'BECL504' ? 'Computer Lab 1' : String(subjectCode) === 'BEC502' && String(activityType) === 'LAB' ? 'Computer Lab 3' : 'MB01')
        : (String(subjectCode) === 'BCS502' && String(activityType) === 'LAB' ? 'Lab3' : 'MB 02'),
      teacherId: String(teacherId), activityType: String(activityType),
      coTeacherId: String(subjectCode) === 'BEC502' && String(activityType) === 'LAB' ? 'archana.s@hnnce.in' : String(subjectCode) === 'BCS502' && String(activityType) === 'LAB' ? 'harshitha@hnnce.in' : undefined,
    })))
  // Replace this semester's source-scoped grids so removed/moved cells from earlier seed drafts cannot survive as duplicate or stale periods.
  await prisma.timetableSlot.deleteMany({
    where: {
      semesterId: defaultSemester.id,
      classGroup: { in: ['CSE-A', 'CSE-B', 'ECE', 'ISE'] },
    },
  });

  // Create timetable slots using assignmentId
  for (const t of timetable) {
    if (t.subjectCode === '__NCMC__' || t.subjectCode === '__UNASSIGNED__') {
      // TimetableSlot.teacherId/coTeacherId are queried by faculty email in the
      // timetable endpoints; assignment faculty fields separately use UUIDs.
      const teacherEmail = t.teacherId;
      const coTeacherEmail = t.coTeacherId ?? null;
      await prisma.timetableSlot.upsert({
        where: {
          classGroup_day_slotIndex_semesterId_batchYear: {
            classGroup: t.classGroup,
            day: t.day,
            slotIndex: t.slotIndex,
            semesterId: defaultSemester.id,
            batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0,
          },
        },
        update: { assignmentId: null, subjectCode: t.subjectCode, activityType: t.activityType, room: t.room, teacherId: teacherEmail, coTeacherId: coTeacherEmail, batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0 },
        create: { day: t.day, slotIndex: t.slotIndex, assignmentId: null, subjectCode: t.subjectCode, activityType: t.activityType, room: t.room, classGroup: t.classGroup, teacherId: teacherEmail, coTeacherId: coTeacherEmail, semesterId: defaultSemester.id, batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0 }
      });
      continue;
    }
    // Find the assignment for this subject and class group
    const subject = await prisma.subject.findUnique({ where: { code: t.subjectCode } });
    if (!subject) {
      console.warn(`No subject found for code: ${t.subjectCode}`);
      continue;
    }
    const assignmentKey = `${t.classGroup}-${subject.id}`;
    const assignmentId = assignmentMap.get(assignmentKey);

    if (assignmentId) {
      const teacherEmail = t.teacherId;
      const coTeacherEmail = t.coTeacherId ?? null;
      await prisma.timetableSlot.upsert({
        where: {
          classGroup_day_slotIndex_semesterId_batchYear: {
            classGroup: t.classGroup,
            day: t.day,
            slotIndex: t.slotIndex,
            semesterId: defaultSemester.id,
            batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0,
          },
        },
        update: {
          assignmentId,
          subjectCode: t.subjectCode,
          activityType: t.activityType,
          room: t.room,
          teacherId: teacherEmail,
          coTeacherId: coTeacherEmail,
          batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0,
        },
        create: {
          day: t.day,
          slotIndex: t.slotIndex,
          assignmentId,
          subjectCode: t.subjectCode,
          activityType: t.activityType,
          room: t.room,
          classGroup: t.classGroup,
          teacherId: teacherEmail,
          coTeacherId: coTeacherEmail,
          semesterId: defaultSemester.id,
          batchYear: classGroupBatchYearMap.get(t.classGroup) ?? 0,
        }
      });
    } else {
      console.warn(`No assignment found for ${t.subjectCode} in classGroup ${t.classGroup}`);
    }
  }

  // Older seed versions incorrectly converted the NCMC/MC alternatives into
  // a faculty-owned MC subject. Remove those obsolete assignments only when
  // no attendance, marks, or timetable rows still depend on them.
  const legacyMcAssignments = await prisma.subjectSectionAssignment.findMany({
    where: { subject: { code: 'MC' }, classGroup: { in: ['CSE-A', 'CSE-B'] } },
    include: { _count: { select: { attendanceSessions: true, marks: true, timetableSlots: true } } },
  });
  for (const assignment of legacyMcAssignments) {
    const counts = assignment._count;
    if (counts.attendanceSessions === 0 && counts.marks === 0 && counts.timetableSlots === 0) {
      await prisma.subjectSectionAssignment.delete({ where: { id: assignment.id } });
    } else {
      console.warn(`Keeping legacy MC assignment ${assignment.id}; related attendance/marks/timetable data exists.`);
    }
  }
  const legacyMcSubject = await prisma.subject.findUnique({ where: { code: 'MC' }, include: { assignments: true } });
  if (legacyMcSubject && legacyMcSubject.assignments.length === 0) {
    await prisma.subject.delete({ where: { code: 'MC' } });
  }

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
