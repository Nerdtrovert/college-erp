import { PrismaClient, SubjectType, SubjectCourseType } from '@prisma/client';

export async function seedSubjects(
  prisma: PrismaClient,
  facultyEmailToIdMap: Map<string, string>,
  facultyData: any[]
) {
  const canonicalSubjects: Array<{ code: string; name: string; type: SubjectType; courseType?: SubjectCourseType }> = [
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
    { code: 'BAIL504', name: 'Data Visualisation LAB', type: SubjectType.STANDALONE },
    { code: 'BNSK559', name: 'Course name not specified in source (BNSK559)', type: SubjectType.STANDALONE },
    { code: 'BPEK559', name: 'Physical Education', type: SubjectType.STANDALONE },
    { code: 'BYOK559', name: 'YOGA', type: SubjectType.STANDALONE },
    { code: 'BAD515C', name: 'Cloud Computing', type: SubjectType.STANDALONE },
    { code: 'BCS502', name: 'Computer Networks', type: SubjectType.INTEGRATED },

    // 3rd Sem Canonical Subjects
    { code: '1BMATCS301', name: 'Mathematics for CSE', type: SubjectType.STANDALONE },
    { code: '1BCS302', name: 'Digital Design & Computer Organization', type: SubjectType.INTEGRATED },
    { code: '1BCS303', name: 'Operating Systems', type: SubjectType.STANDALONE },
    { code: '1BCS304', name: 'Data Structures and Applications', type: SubjectType.STANDALONE },
    { code: '1BCS305', name: 'Object Oriented Programming with Java', type: SubjectType.STANDALONE },
    { code: '1BCSL306', name: 'Data Structures Laboratory', type: SubjectType.STANDALONE },
    { code: '1BAIL307A', name: 'Social Connect & Responsibility', type: SubjectType.STANDALONE },
    { code: '1BCP308', name: 'Project / Technical Ability', type: SubjectType.STANDALONE, courseType: SubjectCourseType.PROJECT },
  ];

  for (const s of canonicalSubjects) {
    // We update name and type just in case they were empty or wrong, 
    // but ideally we could leave them alone. However, we'll keep the update for name and type.
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type, ...(s.courseType ? { courseType: s.courseType } : {}) },
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
      'CSE-A': { theoryFacultyIdName: 'Prof. Vinaya Singh', labFacultyIdName: 'Prof. Harshitha' },
      'CSE-B': { theoryFacultyIdName: 'Prof. Vinaya Singh', labFacultyIdName: 'Prof. Harshitha' },
      ISE: { theoryFacultyIdName: 'Prof. Harshitha', labFacultyIdName: 'Prof. Harshitha' },
    },
    BCS503: {
      'CSE-A': { theoryFacultyIdName: null, labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: null, labFacultyIdName: null },
      ISE: { theoryFacultyIdName: 'Dr. Nagasundara K B', labFacultyIdName: null },
    },
    BRMK557: {
      'CSE-A': { theoryFacultyIdName: 'Dr. Bhargavi K S', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Prof. Lakshmi A N', labFacultyIdName: null },
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
    BAD515C: {
      'AI&DS-A': { theoryFacultyIdName: 'Prof. Vinaya Singh', labFacultyIdName: null },
    },

    // 3rd Sem Subject Assignments
    '1BMATCS301': {
      'AI&DS-A': { theoryFacultyIdName: 'Dr. Preetham Raj', labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Dr. Shwetha K S', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Dr. Shwetha K S', labFacultyIdName: null },
      'ISE-A': { theoryFacultyIdName: 'Prof. Aishwarya M', labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: null, labFacultyIdName: null },
    },
    '1BCS302': {
      'AI&DS-A': { theoryFacultyIdName: 'Prof. Archana B K', labFacultyIdName: 'Prof. Archana B K' },
      'CSE-A': { theoryFacultyIdName: 'Dr. Nanditha Y', labFacultyIdName: 'Dr. Nanditha Y' },
      'CSE-B': { theoryFacultyIdName: 'Dr. Nanditha Y', labFacultyIdName: 'Dr. Nanditha Y' },
      'ISE-A': { theoryFacultyIdName: 'Prof. Archana B K', labFacultyIdName: 'Prof. Archana B K' },
      'ISE-B': { theoryFacultyIdName: 'Prof. Pooja H S', labFacultyIdName: 'Prof. Pooja H S' },
    },
    '1BCS303': {
      'AI&DS-A': { theoryFacultyIdName: 'Prof. Ravishankar', labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Prof. Sunil Kumar S', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Prof. Sunil Kumar S', labFacultyIdName: null },
      'ISE-A': { theoryFacultyIdName: 'Dr. Gopalsharma Joshi', labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: 'Prof. Sunil Kumar S', labFacultyIdName: null },
    },
    '1BCS304': {
      'AI&DS-A': { theoryFacultyIdName: 'Dr. Ashok Kumar A R', labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Dr. Ashok Kumar A R', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Dr. Ashok Kumar A R', labFacultyIdName: null },
      'ISE-A': { theoryFacultyIdName: 'Prof. Shruthi B', labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: 'Prof. Shruthi B', labFacultyIdName: null },
    },
    '1BCS305': {
      'AI&DS-A': { theoryFacultyIdName: 'Prof. Vinay Bharadwaj', labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Dr. Suma Swamy', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Dr. Suma Swamy', labFacultyIdName: null },
      'ISE-A': { theoryFacultyIdName: 'Prof. Vinay Bharadwaj', labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: 'Prof. Bhavana', labFacultyIdName: null },
    },
    '1BCSL306': {
      'AI&DS-A': { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Vinay Bharadwaj' },
      'CSE-A': { theoryFacultyIdName: null, labFacultyIdName: 'Dr. Suma Swamy' },
      'CSE-B': { theoryFacultyIdName: null, labFacultyIdName: 'Dr. Suma Swamy' },
      'ISE-A': { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Vinay Bharadwaj' },
      'ISE-B': { theoryFacultyIdName: null, labFacultyIdName: 'Prof. Bhavana' },
    },
    '1BAIL307A': {
      'AI&DS-A': { theoryFacultyIdName: null, labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Prof. Dhanuja', labFacultyIdName: 'Prof. Brunda' },
      'CSE-B': { theoryFacultyIdName: 'Prof. Dhanuja', labFacultyIdName: 'Prof. Brunda' },
      'ISE-A': { theoryFacultyIdName: null, labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: null, labFacultyIdName: null },
    },
    '1BCP308': {
      'AI&DS-A': { theoryFacultyIdName: 'Dr. Praveen Kumar B C', labFacultyIdName: null },
      'CSE-A': { theoryFacultyIdName: 'Dr. B S C Ranjan', labFacultyIdName: null },
      'CSE-B': { theoryFacultyIdName: 'Dr. B S C Ranjan', labFacultyIdName: null },
      'ISE-A': { theoryFacultyIdName: 'Dr. Praveen Kumar B C', labFacultyIdName: null },
      'ISE-B': { theoryFacultyIdName: 'Dr. Praveen Kumar B C', labFacultyIdName: null },
    },
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
