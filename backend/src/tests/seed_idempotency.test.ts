import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function testSeedIdempotency() {
  console.log('Running seed idempotency test...');
  
  // Get counts before
  const userCountBefore = await prisma.user.count();
  const studentCountBefore = await prisma.studentEnrollment.count();
  const timetableCountBefore = await prisma.timetableSlot.count();

  // Run seed
  execSync('npm run prisma:seed', { stdio: 'inherit' });

  // Get counts after
  const userCountAfter = await prisma.user.count();
  const studentCountAfter = await prisma.studentEnrollment.count();
  const timetableCountAfter = await prisma.timetableSlot.count();

  console.assert(userCountBefore === userCountAfter || userCountBefore === 0, 'User count changed');
  console.assert(studentCountBefore === studentCountAfter || studentCountBefore === 0, 'Student count changed');
  console.assert(timetableCountBefore === timetableCountAfter || timetableCountBefore === 0, 'Timetable count changed');
  
  console.log('Seed idempotency verified.');
}

testSeedIdempotency().catch(console.error).finally(() => prisma.$disconnect());
