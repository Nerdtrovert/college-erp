import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany(),
    prisma.mark.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.note.deleteMany(),
    prisma.adminUpload.deleteMany(),
    prisma.user.deleteMany(),
    prisma.semester.deleteMany(),
  ]);

  console.log('Database cleared.');
}

main()
  .catch((error) => {
    console.error('Failed to clear database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
