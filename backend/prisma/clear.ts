import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Fast path: Truncate all tables and restart sequences in PostgreSQL
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "AttendanceRecord",
        "AttendanceSession",
        "TimetableSlot",
        "Mark",
        "StudentEnrollment",
        "SubjectSectionAssignment",
        "Announcement",
        "Note",
        "AdminUpload",
        "Subject",
        "User",
        "Semester"
      RESTART IDENTITY CASCADE;
    `);
    console.log('All data cleared successfully.');
  } catch (truncateError) {
    // Fallback: Delete in reverse dependency order to satisfy foreign key constraints
    console.warn('TRUNCATE CASCADE failed, falling back to deleteMany in dependency order:', truncateError);
    await prisma.attendanceRecord.deleteMany({});
    await prisma.attendanceSession.deleteMany({});
    await prisma.timetableSlot.deleteMany({});
    await prisma.mark.deleteMany({});
    await prisma.studentEnrollment.deleteMany({});
    await prisma.subjectSectionAssignment.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.adminUpload.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.semester.deleteMany({});

    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS "Announcement_id_seq" RESTART WITH 1;`);
    } catch {
      // Ignore sequence reset error if unsupported
    }
    console.log('All data cleared successfully.');
  }
}

main()
  .catch((error) => {
    console.error('Failed to clear database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });