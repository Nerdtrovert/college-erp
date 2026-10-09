import { PrismaClient, Semester } from '@prisma/client';
import { currentStudents } from '../current-students';
import { batchYearsFromUsn } from '../../src/constants/program';

export async function seedTimetable(
  prisma: PrismaClient,
  defaultSemester: Semester,
  assignmentRecords: any[]
) {
  const classGroupBatchYearMap = new Map<string, number>();
  for (const student of currentStudents) {
    const batchYearInfo = batchYearsFromUsn(student.id);
    if (batchYearInfo) {
      classGroupBatchYearMap.set(student.classGroup, batchYearInfo.startYear);
    }
  }

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

  timetable.push(
    ...[
      ['Monday',0,'BEC503','archana.bk@hnnce.in','THEORY'], ['Monday',1,'BRMK557','','THEORY'], ['Monday',3,'BEC502','sadashiva@hnnce.in','THEORY'], ['Monday',4,'BEC503','archana.bk@hnnce.in','THEORY'], ['Monday',6,'BIS586','', 'PROJECT'], ['Monday',7,'BIS586','', 'PROJECT'],
      ['Tuesday',0,'BEC502','sadashiva@hnnce.in','LAB'], ['Tuesday',1,'BEC502','sadashiva@hnnce.in','LAB'], ['Tuesday',3,'BESK508','lakshmi@hnnce.in','THEORY'], ['Tuesday',4,'BEC502','sadashiva@hnnce.in','THEORY'], ['Tuesday',6,'BIS586','','PROJECT'], ['Tuesday',7,'BIS586','','PROJECT'],
      ['Wednesday',0,'BEC503','archana.bk@hnnce.in','THEORY'], ['Wednesday',1,'BEC515D','shwetha@hnnce.in','THEORY'], ['Wednesday',3,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Wednesday',4,'BESK508','lakshmi@hnnce.in','THEORY'], ['Wednesday',6,'BECL504','','LAB'], ['Wednesday',7,'BECL504','','LAB'],
      ['Thursday',0,'BRM557','ranjan@hnnce.in','THEORY'], ['Thursday',1,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Thursday',3,'BEC502','sadashiva@hnnce.in','THEORY'], ['Thursday',4,'BEC515D','shwetha@hnnce.in','THEORY'], ['Thursday',6,'BECL504','','LAB'], ['Thursday',7,'BECL504','','LAB'],
      ['Friday',0,'BEC515D','shwetha@hnnce.in','THEORY'], ['Friday',1,'BEC503','archana.bk@hnnce.in','THEORY'], ['Friday',3,'BEC501','jayadevappa@hnnce.in','THEORY'], ['Friday',4,'BRM557','ranjan@hnnce.in','THEORY'], ['Friday',6,'__UNASSIGNED__','','UNASSIGNED'], ['Friday',7,'__UNASSIGNED__','','UNASSIGNED'],
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
    }))
  );

  for (const t of timetable) {
    const whereCondition = {
      classGroup_day_slotIndex_semesterId: {
        classGroup: t.classGroup,
        day: t.day,
        slotIndex: t.slotIndex,
        semesterId: defaultSemester.id,
      }
    };

    const existing = await prisma.timetableSlot.findUnique({
      where: whereCondition
    });

    if (t.subjectCode === '__NCMC__' || t.subjectCode === '__UNASSIGNED__') {
      if (!existing) {
        await prisma.timetableSlot.create({
          data: {
            day: t.day,
            slotIndex: t.slotIndex,
            subjectCode: t.subjectCode,
            activityType: t.activityType,
            room: t.room,
            classGroup: t.classGroup,
            teacherId: t.teacherId,
            coTeacherId: t.coTeacherId,
            semesterId: defaultSemester.id,
          }
        });
      }
      continue;
    }

    const subject = await prisma.subject.findUnique({ where: { code: t.subjectCode } });
    if (!subject) continue;

    const assignmentKey = `${t.classGroup}-${subject.id}`;
    const assignmentId = assignmentMap.get(assignmentKey);

    if (assignmentId && !existing) {
      await prisma.timetableSlot.create({
        data: {
          day: t.day,
          slotIndex: t.slotIndex,
          assignmentId,
          subjectCode: t.subjectCode,
          activityType: t.activityType,
          room: t.room,
          classGroup: t.classGroup,
          teacherId: t.teacherId,
          coTeacherId: t.coTeacherId,
          semesterId: defaultSemester.id,
        }
      });
    } else if (assignmentId && existing) {
      // If it exists, we only make sure assignmentId is linked just in case it's null, 
      // but we do NOT overwrite room, teacherId, or activityType which could have been edited by admin!
      if (!existing.assignmentId) {
        await prisma.timetableSlot.update({
          where: whereCondition,
          data: { assignmentId }
        });
      }
    }
  }

  console.log('Timetable seeded.');
}
