import { PrismaClient, Role, SemesterStatus, SubjectType } from '@prisma/client';
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
    { id: 'faculty@hnnce.in', name: 'Dr. Priya Sharma', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science and Engineering (CSE)' },
    { id: 'ramesh@hnnce.in', name: 'Prof. Ramesh Iyer', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science and Engineering (CSE)' },
    { id: 'anita@hnnce.in', name: 'Dr. Anita Raj', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science and Engineering (CSE)' },
    { id: 'vijay@hnnce.in', name: 'Mr. Vijay Kumar', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science and Engineering (CSE)' },
    { id: 'meena@hnnce.in', name: 'Dr. Meena Nair', password: teacherPasswordHash, role: Role.teacher, department: 'Computer Science and Engineering (CSE)' },
    // Dean user
    { id: 'deanCSE@hnnce.in', name: 'Dr. Dean Administrator', password: deanPasswordHash, role: Role.dean, department: 'Administration' },
  ];

  for (const f of facultyData) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: {
        name: f.name,
        password: f.password,
        role: f.role,
        department: f.department,
      },
      create: f,
    });
  }
  console.log('Faculty users seeded (including Dean).');

  // 2. Seed Student Users
  const students = [
    { id: '1HC24CS042', name: 'Rehman Dakait', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS001', name: 'Aakash Nair', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS002', name: 'Aditi Rao', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS003', name: 'Ajay Singh', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS004', name: 'Amrita Das', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS005', name: 'Ananya Krishnan', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS006', name: 'Rehman Dakait (Duplicate Roll)', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS007', name: 'Bhavna Pillai', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS008', name: 'Deepak Verma', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS009', name: 'Divya Sharma', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS010', name: 'Ganesh Reddy', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS011', name: 'Harish Kumar', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS012', name: 'Ishita Bansal', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS013', name: 'Jayant Patel', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS014', name: 'Kavitha Mohan', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS015', name: 'Kiran Menon', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS016', name: 'Lavanya Subramanian', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS017', name: 'Manish Gupta', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
    { id: '1HC24CS018', name: 'Rohit Sharma', password: studentPasswordHash, role: Role.student, department: 'Computer Science and Engineering (CSE)', classGroup: 'CSE-B' },
  ];

  for (const s of students) {
    await prisma.user.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        password: s.password,
        role: s.role,
        department: s.department,
        classGroup: s.classGroup,
      },
      create: s,
    });
  }
  console.log('Student users seeded.');

  // 3. Seed Subjects
  const subjects = [
    { code: 'CS2301', name: 'Data Structures & Algorithms', facultyId: 'faculty@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2302', name: 'Operating Systems', facultyId: 'ramesh@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2303', name: 'Computer Networks', facultyId: 'anita@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2304', name: 'Database Systems', facultyId: 'vijay@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2305', name: 'Software Engineering', facultyId: 'meena@hnnce.in', classGroup: 'CSE-B', type: SubjectType.STANDALONE },
    // Labs
    { code: 'CS2301L', name: 'DS Lab', facultyId: 'faculty@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2302L', name: 'OS Lab', facultyId: 'ramesh@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
    { code: 'CS2303L', name: 'Networks Lab', facultyId: 'anita@hnnce.in', classGroup: 'CSE-B', type: SubjectType.INTEGRATED },
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
      authorId: 'vijay@hnnce.in', // Mr. Vijay Kumar (Exam Cell / Academic)
      target: 'all',
      pinned: true,
    },
    {
      title: 'Lab record submission deadline extended to Nov 15',
      body: 'Due to technical issues in some labs, the deadline for submission of laboratory records has been extended to November 15, 2024. Please ensure your records are complete and signed by the respective lab instructors.',
      category: 'info',
      date: 'Nov 8, 2024',
      authorId: 'meena@hnnce.in', // Academic Office
      target: 'all',
      pinned: false,
    },
    {
      title: 'Guest lecture on AI/ML — Nov 14, 2 PM, Seminar Hall',
      body: 'The Computer Science Department is organizing a guest lecture on Artificial Intelligence and Machine Learning by Dr. Rajesh Kumar from IIT Delhi. All interested students are invited to attend the session on November 14, 2024 at 2:00 PM in the Seminar Hall.',
      category: 'event',
      date: 'Nov 7, 2024',
      authorId: 'faculty@hnnce.in', // Dr. Priya Sharma
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
    { day: 'Monday', slotIndex: 0, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'faculty@hnnce.in' },
    { day: 'Monday', slotIndex: 1, subjectCode: 'CS2302', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'ramesh@hnnce.in' },
    { day: 'Monday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' }, // Break
    { day: 'Monday', slotIndex: 3, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'anita@hnnce.in' },
    { day: 'Monday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Monday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' }, // Lunch
    { day: 'Monday', slotIndex: 6, subjectCode: 'CS2301L', room: 'Lab-2', classGroup: 'CSE-B', teacherId: 'faculty@hnnce.in' },
    { day: 'Monday', slotIndex: 7, subjectCode: 'CS2301L', room: 'Lab-2', classGroup: 'CSE-B', teacherId: 'faculty@hnnce.in' },

    // Tuesday
    { day: 'Tuesday', slotIndex: 0, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'vijay@hnnce.in' },
    { day: 'Tuesday', slotIndex: 1, subjectCode: 'CS2305', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'meena@hnnce.in' },
    { day: 'Tuesday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 3, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'faculty@hnnce.in' },
    { day: 'Tuesday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Tuesday', slotIndex: 6, subjectCode: 'CS2303L', room: 'Lab-4', classGroup: 'CSE-B', teacherId: 'anita@hnnce.in' },
    { day: 'Tuesday', slotIndex: 7, subjectCode: 'CS2303L', room: 'Lab-4', classGroup: 'CSE-B', teacherId: 'anita@hnnce.in' },

    // Wednesday
    { day: 'Wednesday', slotIndex: 0, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'anita@hnnce.in' },
    { day: 'Wednesday', slotIndex: 1, subjectCode: 'CS2302', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'ramesh@hnnce.in' },
    { day: 'Wednesday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Wednesday', slotIndex: 3, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'vijay@hnnce.in' },

    // Thursday
    { day: 'Thursday', slotIndex: 0, subjectCode: 'CS2305', room: 'LH-4', classGroup: 'CSE-B', teacherId: 'meena@hnnce.in' },
    { day: 'Thursday', slotIndex: 1, subjectCode: 'CS2301', room: 'LH-3', classGroup: 'CSE-B', teacherId: 'faculty@hnnce.in' },
    { day: 'Thursday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 3, subjectCode: 'CS2302', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'ramesh@hnnce.in' },
    { day: 'Thursday', slotIndex: 4, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 5, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Thursday', slotIndex: 6, subjectCode: 'CS2302L', room: 'Lab-1', classGroup: 'CSE-B', teacherId: 'ramesh@hnnce.in' },
    { day: 'Thursday', slotIndex: 7, subjectCode: 'CS2302L', room: 'Lab-1', classGroup: 'CSE-B', teacherId: 'ramesh@hnnce.in' },

    // Friday
    { day: 'Friday', slotIndex: 0, subjectCode: 'CS2303', room: 'LH-5', classGroup: 'CSE-B', teacherId: 'anita@hnnce.in' },
    { day: 'Friday', slotIndex: 1, subjectCode: 'CS2304', room: 'LH-2', classGroup: 'CSE-B', teacherId: 'vijay@hnnce.in' },
    { day: 'Friday', slotIndex: 2, subjectCode: null, room: null, classGroup: 'CSE-B', teacherId: '' },
    { day: 'Friday', slotIndex: 3, subjectCode: 'CS2305', room: 'LH-4', classGroup: 'CSE-B', teacherId: 'meena@hnnce.in' },
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
  const activeStudents = ['1HC24CS042', '1HC24CS001', '1HC24CS002', '1HC24CS003', '1HC24CS004', '1HC24CS005'];
  const testSubjects = ['CS2301', 'CS2302', 'CS2303', 'CS2304', 'CS2305', 'CS2301L', 'CS2302L', 'CS2303L'];

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