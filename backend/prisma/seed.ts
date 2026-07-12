import { PrismaClient, Role, SemesterStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  // Hash passwords
  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const deanPasswordHash = await bcrypt.hash('dean123', 10); // Dean password

  // Seed default semester first so other records can reference its ID
  const defaultSemester = await prisma.semester.upsert({
    where: { id: 'sem1' },
    update: {},
    create: {
      id: 'sem1',
      name: 'Fall 2024',
      startDate: '2024-08-01',
      endDate: '2024-12-20',
      status: SemesterStatus.ACTIVE,
    },
  });
  console.log('Default semester seeded.');

  // 1. Seed Faculty Users (including Dean)
  const facultyData = [
    { id: 'FAC2018', name: 'Dr. Priya Sharma', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science & Engineering' },
    { id: 'FAC2019', name: 'Prof. Ramesh Iyer', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science & Engineering' },
    { id: 'FAC2020', name: 'Dr. Anita Raj', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science & Engineering' },
    { id: 'FAC2021', name: 'Mr. Vijay Kumar', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science & Engineering' },
    { id: 'FAC2022', name: 'Dr. Meena Nair', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science & Engineering' },
    // Dean user
    { id: 'DEAN123', name: 'Dr. Dean Administrator', password: deanPasswordHash, role: Role.dean, department: 'Administration' },
  ];

  for (const f of facultyData) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: {},
      create: f,
    });
  }
  console.log('Faculty users seeded (including Dean).');

  // 2. Seed Student Users
  const students = [
    { id: 'CS21B042', name: 'Rehman Dakait', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B001', name: 'Aakash Nair', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B002', name: 'Aditi Rao', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B003', name: 'Ajay Singh', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B004', name: 'Amrita Das', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B005', name: 'Ananya Krishnan', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B006', name: 'Rehman Dakait (Duplicate Roll)', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B007', name: 'Bhavna Pillai', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B008', name: 'Deepak Verma', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B009', name: 'Divya Sharma', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B010', name: 'Ganesh Reddy', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B011', name: 'Harish Kumar', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B012', name: 'Ishita Bansal', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B013', name: 'Jayant Patel', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B014', name: 'Kavitha Mohan', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B015', name: 'Kiran Menon', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B016', name: 'Lavanya Subramanian', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B017', name: 'Manish Gupta', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
    { id: 'CS21B018', name: 'Rohit Sharma', password: studentPasswordHash, role: Role.student, department: 'Computer Science & Engineering', classGroup: 'CSE-B' },
  ];

  for (const s of students) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log('Student users seeded.');

  // 3. Seed Subjects
  const subjects = [
    { code: 'CS2301', name: 'Data Structures & Algorithms', facultyId: 'FAC2018', classGroup: 'CSE-B' },
    { code: 'CS2302', name: 'Operating Systems', facultyId: 'FAC2019', classGroup: 'CSE-B' },
    { code: 'CS2303', name: 'Computer Networks', facultyId: 'FAC2020', classGroup: 'CSE-B' },
    { code: 'CS2304', name: 'Database Systems', facultyId: 'FAC2021', classGroup: 'CSE-B' },
    { code: 'CS2305', name: 'Software Engineering', facultyId: 'FAC2022', classGroup: 'CSE-B' },
    // Labs
    { code: 'CS2301L', name: 'DS Lab', facultyId: 'FAC2018', classGroup: 'CSE-B' },
    { code: 'CS2302L', name: 'OS Lab', facultyId: 'FAC2019', classGroup: 'CSE-B' },
    { code: 'CS2303L', name: 'Networks Lab', facultyId: 'FAC2020', classGroup: 'CSE-B' },
  ];

  for (const sub of subjects) {
    await prisma.subject.upsert({
      where: { code: sub.code },
      update: {},
      create: sub,
    });
  }
  console.log('Subjects seeded.');

  // 4. Seed Announcements
  const announcements = [
    {
      title: 'Mid-semester exams begin Nov 18',
      body: 'All students are notified that mid-semester examinations will commence from November 18, 2024. The exam schedule has been posted on the notice board and college website.',
      category: 'exam',
      date: 'Nov 10, 2024',
      authorId: 'FAC2021', // Mr. Vijay Kumar (Exam Cell / Academic)
      target: 'all',
      pinned: true,
    },
    {
      title: 'Lab record submission deadline extended to Nov 15',
      body: 'Due to technical issues in some labs, the deadline for submission of laboratory records has been extended to November 15, 2024. Please ensure your records are complete and signed by the respective lab instructors.',
      category: 'info',
      date: 'Nov 8, 2024',
      authorId: 'FAC2022', // Academic Office
      target: 'all',
      pinned: false,
    },
    {
      title: 'Guest lecture on AI/ML — Nov 14, 2 PM, Seminar Hall',
      body: 'The Computer Science Department is organizing a guest lecture on Artificial Intelligence and Machine Learning by Dr. Rajesh Kumar from IIT Delhi. All interested students are invited to attend the session on November 14, 2024 at 2:00 PM in the Seminar Hall.',
      category: 'event',
      date: 'Nov 7, 2024',
      authorId: 'FAC2018', // Dr. Priya Sharma
      target: 'all',
      pinned: false,
    },
  ];

  for (const a of announcements) {
    await prisma.announcement.create({
      data: a,
    });
  }
  console.log('Announcements seeded.');

  // 5. Seed Timetable Slots (Monday to Friday, 8 slots per day)
  // Index: 0: 8:30-9:30, 1: 9:30-10:30, 2: Break, 3: 11:00-12:00, 4: 12:00-1:00, 5: Lunch, 6: 1:45-2:45, 7: 2:45-3:45
  // We populate for CSE-B
  const timetable = [
    // Monday
    { day: 'Monday', slotIndex: 0, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'FAC2018' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'CS2302', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'FAC2019' },
    { day: 'Monday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' }, // Break
    { day: 'Monday', slotIndex: 3, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'FAC2020' },
    { day: 'Monday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Monday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' }, // Lunch
    { day: 'Monday', slotIndex: 6, subjectCode: 'CS2301L', room: 'Lab-2', classGroup: 'CSE-B', teacherId: 'FAC2018' },
    { day: 'Monday', slotIndex: 7, subjectCode: 'CS2301L', room: 'Lab-2', classGroup: 'CSE-B', teacherId: 'FAC2018' },

    // Tuesday
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'FAC2021' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'CS2305', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'FAC2022' },
    { day: 'Tuesday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'FAC2018' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 6, subjectCode: 'CS2303L', room: 'Lab-4', classGroup: 'CSE-B', teacherId: 'FAC2020' },
    { day: 'Tuesday', slotIndex: 7, subjectCode: 'CS2303L', room: 'Lab-4', classGroup: 'CSE-B', teacherId: 'FAC2020' },

    // Wednesday
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'FAC2020' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'CS2302', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'FAC2019' },
    { day: 'Wednesday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'FAC2021' },

    // Thursday
    { day: 'Thursday', slotIndex: 0, subjectCode: 'CS2305', room: 'LH-4', classGroup: 'CSE-B', teacherId: 'FAC2022' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'FAC2018' },
    { day: 'Thursday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'CS2302', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'FAC2019' },
    { day: 'Thursday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'CS2302L', room: 'Lab-1', classGroup: 'CSE-B', teacherId: 'FAC2019' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'CS2302L', room: 'Lab-1', classGroup: 'CSE-B', teacherId: 'FAC2019' },

    // Friday
    { day: 'Friday', slotIndex: 0, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'FAC2020' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'FAC2021' },
    { day: 'Friday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'CS2305', room: 'LH-4', classGroup: 'CSE-B', teacherId: 'FAC2022' },
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
      },
      create: {
        day: t.day,
        slotIndex: t.slotIndex,
        subjectCode: t.subjectCode,
        room: t.room,
        classGroup: t.classGroup,
        teacherId: t.teacherId,
        semesterId: defaultSemester.id,
      },
    });
  }
  console.log('Timetable seeded.');

  // 7. Seed mock Marks for the demo students
  const activeStudents = ['CS21B042', 'CS21B001', 'CS21B002', 'CS21B003', 'CS21B004', 'CS21B005'];
  const testSubjects = ['CS2301', 'CS2302', 'CS2303', 'CS2304', 'CS2305'];
  const assessmentTypes = [
    { type: 'ia1', max: 30 },
    { type: 'ia2', max: 30 },
    { type: 'assignment', max: 10 },
    { type: 'lab', max: 25 },
  ];

  for (const sId of activeStudents) {
    for (const subCode of testSubjects) {
      for (const ass of assessmentTypes) {
        // Generate a random score or set some fixed mock score
        let score: number | null = Math.floor(Math.random() * (ass.max - ass.max * 0.5) + ass.max * 0.5);
        if (sId === 'CS21B042' && subCode === 'CS2305' && ass.type === 'ia2') {
          score = null; // Pending mark for SE IA2 for Rehman Dakait
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
          update: {},
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
          subjectCode_date_classGroup_semesterId: {
            subjectCode: subCode,
            date: date,
            classGroup: 'CSE-B',
            semesterId: defaultSemester.id,
          },
        },
        update: {},
        create: {
          subjectCode: subCode,
          date: date,
          classGroup: 'CSE-B',
          semesterId: defaultSemester.id,
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
            studentId: 'CS21B042',
          },
        },
        update: {},
        create: {
          sessionId: session.id,
          studentId: 'CS21B042',
          status,
        },
      });

      // For other students, mark them mostly present
      for (const sId of activeStudents.filter(id => id !== 'CS21B042')) {
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