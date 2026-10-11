import { PrismaClient } from '@prisma/client';
import { seedSemester } from './seeds/semester';
import { seedFaculty } from './seeds/faculty';
import { seedStudents } from './seeds/students';
import { seedSubjects } from './seeds/subjects';
import { seedTimetable } from './seeds/timetable';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');
  const defaultSemester = await seedSemester(prisma);
  const { facultyEmailToIdMap, facultyData } = await seedFaculty(prisma);
  await seedStudents(prisma, defaultSemester);
  const assignmentRecords = await seedSubjects(prisma, facultyEmailToIdMap, facultyData);
  await seedTimetable(prisma, defaultSemester, assignmentRecords);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
