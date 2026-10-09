import { PrismaClient } from '@prisma/client';
import { seedSemester } from './seeds/semester';
import { seedFaculty } from './seeds/faculty';
import { seedStudents } from './seeds/students';
import { seedSubjects } from './seeds/subjects';
import { seedTimetable } from './seeds/timetable';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');
  try {
    const defaultSemester = await seedSemester(prisma);
    const { facultyEmailToIdMap, facultyData } = await seedFaculty(prisma);
    await seedStudents(prisma, defaultSemester);
    const assignmentRecords = await seedSubjects(prisma, facultyEmailToIdMap, facultyData);
    await seedTimetable(prisma, defaultSemester, assignmentRecords);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
