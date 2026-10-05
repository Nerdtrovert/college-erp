import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete in order to avoid foreign key constraints
    await prisma.timetableSlot.deleteMany({});
    await prisma.attendanceRecord.deleteMany({});
    await prisma.attendanceSession.deleteMany({});
    await prisma.studentEnrollment.deleteMany({});
    await prisma.mark.deleteMany({});
    await prisma.assignment.deleteMany({}); // Note: This is SubjectSectionAssignment? Actually, the model is SubjectSectionAssignment
    await prisma.subject.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.semester.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.adminUpload.deleteMany({});
    console.log('All data cleared.');
  } catch (e) {
    console.error('Error clearing data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();