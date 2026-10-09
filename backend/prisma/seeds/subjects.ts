import { PrismaClient, SubjectType } from '@prisma/client';

export async function seedSubjects(
  prisma: PrismaClient,
  facultyEmailToIdMap: Map<string, string>,
  facultyData: any[]
) {
  const canonicalSubjects = [
    { code: 'BCS501', name: 'Software Engineering & PM', type: SubjectType.STANDALONE },
    { code: 'BCS503', name: 'Theory of Computation', type: SubjectType.STANDALONE },
    { code: 'BRMK557', name: 'Research Methodology and IPR', type: SubjectType.STANDALONE },
    { code: 'BRM557', name: 'Research Methodology', type: SubjectType.STANDALONE },
    { code: 'BCS515B', name: 'Artificial Intelligence', type: SubjectType.STANDALONE },
    { code: 'BCS508', name: 'Env Studies & E-Waste Mgmt', type: SubjectType.STANDALONE },
    { code: 'BCSL504', name: 'Web Technology Lab', type: SubjectType.STANDALONE },
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
    { code: 'BCS502', name: 'Computer Networks', type: SubjectType.INTEGRATED },
  ];

  for (const s of canonicalSubjects) {
    // We update name and type just in case they were empty or wrong, 
    // but ideally we could leave them alone. However, we'll keep the update for name and type.
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type },
      create: s,
    });
  }
  console.log('Canonical subjects seeded.');

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

  const assignmentRecords = [];
  for (const [subjectCode, sections] of Object.entries(subjectAssignments)) {
    for (const [classGroup, facultyIds] of Object.entries(sections as any)) {
      const subject = await prisma.subject.findUnique({
        where: { code: subjectCode },
      });
      if (subject) {
        const getFacultyIdByName = (name: string | null): string | null => {
          if (!name) return null;
          const person = facultyData.find((item: any) => item.name.toLowerCase() === name.toLowerCase());
          return person ? facultyEmailToIdMap.get(person.email.toLowerCase()) || null : null;
        };

        const theoryFacultyId = getFacultyIdByName((facultyIds as any).theoryFacultyIdName);
        const labFacultyId = getFacultyIdByName((facultyIds as any).labFacultyIdName);

        // Do not update faculty ids if they exist, so we don't overwrite manual changes
        const existing = await prisma.subjectSectionAssignment.findUnique({
          where: { subjectId_classGroup: { subjectId: subject.id, classGroup } }
        });

        if (existing) {
          assignmentRecords.push(existing);
        } else {
          const assignment = await prisma.subjectSectionAssignment.create({
            data: {
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
  }

  // legacy cleanup
  const legacyMcAssignments = await prisma.subjectSectionAssignment.findMany({
    where: { subject: { code: 'MC' }, classGroup: { in: ['CSE-A', 'CSE-B'] } },
    include: { _count: { select: { attendanceSessions: true, marks: true, timetableSlots: true } } },
  });
  for (const assignment of legacyMcAssignments) {
    const counts = assignment._count;
    if (counts.attendanceSessions === 0 && counts.marks === 0 && counts.timetableSlots === 0) {
      await prisma.subjectSectionAssignment.delete({ where: { id: assignment.id } });
    }
  }
  const legacyMcSubject = await prisma.subject.findUnique({ where: { code: 'MC' }, include: { assignments: true } });
  if (legacyMcSubject && legacyMcSubject.assignments.length === 0) {
    await prisma.subject.delete({ where: { code: 'MC' } });
  }

  console.log('Subject section assignments seeded.');
  return assignmentRecords;
}
