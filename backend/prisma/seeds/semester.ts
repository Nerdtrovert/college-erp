import { PrismaClient, SemesterStatus } from '@prisma/client';

export async function seedSemester(prisma: PrismaClient) {
  const defaultSemester = await prisma.semester.upsert({
    where: { code: 'sem1' },
    update: { name: 'Odd sem 2026-27' }, // Keep existing dates if already managed
    create: {
      code: 'sem1',
      name: 'Odd sem 2026-27',
      startDate: '2026-08-01',
      endDate: '2026-12-20',
      status: SemesterStatus.ACTIVE,
    },
  });
  console.log('Default semester seeded.');
  return defaultSemester;
}
