import { PrismaClient, Role, SemesterStatus, SubjectType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const deanPasswordHash = await bcrypt.hash('dean123', 10);
  const hodPasswordHash = await bcrypt.hash('hod123', 10);

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
  ];

  for (const f of facultyData) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: { name: f.name, password: f.password, role: f.role, department: f.department },
      create: f,
    });
  }
  console.log('Faculty seeded.');

  // Students Data
  const students = [
    // CSE-A Students
    { id: '1HC24CS001', name: 'Aarav Patel', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A' },
    { id: '1HC24CS002', name: 'Diya Sharma', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A' },
    { id: '1HC24CS003', name: 'Kabir Singh', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A' },

    // CSE-B Students
    { id: '1HC24CS042', name: 'Rehman Dakait', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B' },
    { id: '1HC24CS043', name: 'Sanya Gupta', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B' },
    { id: '1HC24CS044', name: 'Vihaan Reddy', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B' },

    // More Mock Students (A Section)
    { id: '1HC24CS004', name: 'Rohan Sharma', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS005', name: 'Anjali Desai', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 2, backlogSubjects: ['CS101', 'MA101'] },
    { id: '1HC24CS006', name: 'Vikram Singh', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 1, backlogSubjects: ['PH101'] },
    { id: '1HC24CS007', name: 'Sneha Reddy', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS008', name: 'Karan Malhotra', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 3, backlogSubjects: ['CS101', 'MA101', 'EC101'] },
    { id: '1HC24CS009', name: 'Neha Kapoor', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS010', name: 'Arjun Iyer', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 1, backlogSubjects: ['ME101'] },
    { id: '1HC24CS011', name: 'Priya Patel', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-A', numberOfBacklogs: 0, backlogSubjects: [] },

    // More Mock Students (B Section)
    { id: '1HC24CS045', name: 'Rahul Menon', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS046', name: 'Riya Gupta', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 1, backlogSubjects: ['CS101'] },
    { id: '1HC24CS047', name: 'Aditya Rao', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS048', name: 'Karthik Nair', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 2, backlogSubjects: ['MA101', 'PH101'] },
    { id: '1HC24CS049', name: 'Meera Joshi', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 0, backlogSubjects: [] },
    { id: '1HC24CS050', name: 'Vivek Verma', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 4, backlogSubjects: ['CS101', 'MA101', 'PH101', 'EC101'] },
    { id: '1HC24CS051', name: 'Divya Choudhury', password: studentPasswordHash, role: Role.student, department: 'Dept of CSE', classGroup: 'CSE-B', numberOfBacklogs: 1, backlogSubjects: ['EC101'] },
  ];

  const programForSection = (classGroup: string) => {
    if (classGroup.startsWith('ISE')) return 'ISE';
    if (classGroup.startsWith('AI&DS')) return 'AI&DS';
    if (classGroup.startsWith('ECE')) return 'ECE';
    return 'CSE';
  };

  for (const s of students) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: { name: s.name, password: s.password, role: s.role, department: null, program: programForSection(s.classGroup), classGroup: s.classGroup, numberOfBacklogs: (s as any).numberOfBacklogs || 0, backlogSubjects: (s as any).backlogSubjects || [] },
      create: { ...s, department: null, program: programForSection(s.classGroup) },
    });
  }
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

  // 7. Seed mock Marks for the demo students
  const activeStudents = ['1HC24CS042', '1HC24CS001', '1HC24CS002', '1HC24CS003', '1HC24CS004', '1HC24CS005'];
  const testSubjects = ['BCS501-A', 'BCS502-A', 'BCS503-A', 'BCS501-B', 'BCS502-B', 'BCS503-B'];

  for (const sId of activeStudents) {
    for (const subCode of testSubjects) {
      // Find seeded subject type
      const sub = subjects.find(s => s.code === subCode);
      if (!sub) continue;

      let assessments: { type: string; max: number }[] = [];
      if (sub.type === SubjectType.STANDALONE) {
        assessments = [
          { type: 'cie1', max: 50 },
          { type: 'cie2', max: 50 },
          { type: 'cie3', max: 50 },
          { type: 'assignment', max: 25 },
        ];
      } else {
        assessments = [
          { type: 'cie1', max: 50 },
          { type: 'cie2', max: 50 },
          { type: 'cie3', max: 50 },
          { type: 'assignment1', max: 10 },
          { type: 'assignment2', max: 10 },
          { type: 'lab', max: 25 },
        ];
      }

      for (const ass of assessments) {
        // Generate a random score or set some fixed mock score
        let score: number | null = Math.floor(Math.random() * (ass.max - ass.max * 0.5) + ass.max * 0.5);

        // Let's create some pending marks for the demo student Rehman Dakait (CS21B042)
        if (sId === '1HC24CS042') {
          // Software Engineering (CS2305 - Theory) is missing cie3
          if (subCode === 'CS2305' && ass.type === 'cie3') {
            score = null;
          }
          // Labs CS2301L, CS2302L, CS2303L have all pending marks
          if (subCode.endsWith('L')) {
            score = null;
          }
        }

        await prisma.mark.upsert({
          where: {
            studentId_subjectCode_type_semesterId: {
              studentId: sId,
              subjectCode: subCode,
              type: ass.type,
              semesterId: defaultSemester.id,
            },
          },
          update: {
            maxScore: ass.max,
          },
          create: {
            studentId: sId,
            subjectCode: subCode,
            type: ass.type,
            score,
            maxScore: ass.max,
            semesterId: defaultSemester.id,
          },
        });
      }
    }
  }
  console.log('Marks seeded.');

  // 8. Seed mock Attendance Sessions & Records
  const dates = ['2024-11-01', '2024-11-04', '2024-11-06', '2024-11-08', '2024-11-11', '2024-11-12', '2024-11-14', '2024-11-15'];

  for (const subCode of testSubjects) {
    for (const date of dates) {
      const session = await prisma.attendanceSession.upsert({
        where: {
          subjectCode_date_classGroup_semesterId_startTime_endTime: {
            subjectCode: subCode,
            date: date,
            classGroup: 'CSE-B',
            semesterId: defaultSemester.id,
            startTime: '08:30',
            endTime: '09:30',
          },
        },
        update: {},
        create: {
          subjectCode: subCode,
          date: date,
          classGroup: 'CSE-B',
          semesterId: defaultSemester.id,
          startTime: '08:30',
          endTime: '09:30',
        },
      });

      // Attendance records for Rehman Dakait (CS21B042) to match StudentAttendance.tsx percentages
      let status = 'present';
      if (subCode === 'CS2301' && (date === '2024-11-06' || date === '2024-11-14')) status = 'absent';
      if (subCode === 'CS2302' && (date === '2024-11-04' || date === '2024-11-06' || date === '2024-11-11' || date === '2024-11-15')) status = 'absent';
      if (subCode === 'CS2303' && date === '2024-11-12') status = 'absent';
      if (subCode === 'CS2304' && (date === '2024-11-01' || date === '2024-11-04' || date === '2024-11-08' || date === '2024-11-14')) status = 'absent';
      if (subCode === 'CS2305' && (date === '2024-11-08' || date === '2024-11-14')) status = 'absent';

      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: '1HC24CS042',
          },
        },
        update: {},
        create: {
          sessionId: session.id,
          studentId: '1HC24CS042',
          status,
        },
      });

      // For other students, mark them mostly present
      for (const sId of activeStudents.filter(id => id !== '1HC24CS042')) {
        const otherStatus = Math.random() > 0.15 ? 'present' : 'absent';
        await prisma.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: sId,
            },
          },
          update: {},
          create: {
            sessionId: session.id,
            studentId: sId,
            status: otherStatus,
          },
        });
      }
    }
  }
  console.log('Attendance seeded.');

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
