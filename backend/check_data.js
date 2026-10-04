const { PrismaClient } = require('./node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const [subjectCount, markCount, attendanceCount, timetableCount, userCount] = await Promise.all([
      prisma.subject.count(),
      prisma.mark.count(),
      prisma.attendanceSession.count(),
      prisma.timetableSlot.count(),
      prisma.user.count()
    ]);
    
    console.log('Current record counts:');
    console.log(`- Subjects: ${subjectCount}`);
    console.log(`- Marks: ${markCount}`);
    console.log(`- Attendance Sessions: ${attendanceCount}`);
    console.log(`- Timetable Slots: ${timetableCount}`);
    console.log(`- Users: ${userCount}`);
    
    // Show some sample subjects to understand the pattern
    const subjects = await prisma.subject.findMany({
      take: 10,
      select: { code: true, name: true, classGroup: true, facultyId: true, coFacultyId: true, type: true }
    });
    
    console.log('\nSample subjects:');
    subjects.forEach(s => {
      console.log(`  ${s.code}: ${s.name} (${s.classGroup}) - ${s.type} - Faculty: ${s.facultyId}${s.coFacultyId ? ', CoFaculty: ' + s.coFacultyId : ''}`);
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
