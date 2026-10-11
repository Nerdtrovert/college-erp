import { PrismaClient, Role, Semester } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { currentStudents } from '../current-students';
import { batchYearsFromUsn, semesterNumberFromUsn } from '../../src/constants/program';

export async function seedStudents(prisma: PrismaClient, defaultSemester: Semester) {
  const isProd = process.env.NODE_ENV === 'production';
  const defaultPasswordStr = process.env.DEFAULT_STUDENT_PASSWORD || (isProd ? null : 'student123');
  
  if (isProd && !defaultPasswordStr) {
    throw new Error('FATAL: Running in production without DEFAULT_STUDENT_PASSWORD set. Aborting seed.');
  }

  const studentPasswordHash = await bcrypt.hash(defaultPasswordStr!, 10);
  // Build a map of lowercase email to user for quick lookup, detecting case-only duplicates
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const emailToUserMap = new Map<string, Array<any>>();
  for (const user of allUsers) {
    if (user.email) {
      const key = user.email.toLowerCase();
      if (!emailToUserMap.has(key)) {
        emailToUserMap.set(key, []);
      }
      emailToUserMap.get(key).push(user);
    }
  }

  const studentUsers = [];

  for (const student of currentStudents) {
    const email = student.id.toLowerCase();
    const userList = emailToUserMap.get(email);
    const batchYearInfo = batchYearsFromUsn(student.id);
    let studentUser;

    if (userList) {
      if (userList.length > 1) {
        throw new Error(`Ambiguous users found for email ${email}: ${userList.map(u => u.id).join(', ')}. Cannot proceed with seed due to case-only duplicates.`);
      }
      let user = userList[0];
      // If the stored email does not match the lowercase version, update it to lowercase
      if (user.email && user.email.toLowerCase() !== email) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email }
        });
        // Note: the email has been updated, but the lowercase key remains the same.
        // No need to update the map because the key (lowercase email) is unchanged.
      }
      studentUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          batchStartYear: batchYearInfo?.startYear,
          batchEndYear: batchYearInfo?.endYear,
          program: student.program,
          classGroup: student.classGroup,
          semesterId: defaultSemester.id,
          // DO NOT OVERWRITE NAME AND PASSWORD
        },
      });
    } else {
      studentUser = await prisma.user.create({
        data: {
          email,
          name: student.name,
          password: studentPasswordHash,
          role: Role.student,
          isActive: true,
          batchStartYear: batchYearInfo?.startYear,
          batchEndYear: batchYearInfo?.endYear,
          department: null,
          program: student.program,
          classGroup: student.classGroup,
          semesterId: defaultSemester.id,
        },
      });
      // Add to map: create a new array for this key
      emailToUserMap.set(email, [studentUser]);
    }
    studentUsers.push(studentUser);
  }
  console.log("Students seeded.");

  const studentEmailToIdMap = new Map<string, string>();
  for (const su of studentUsers) {
    studentEmailToIdMap.set(su.email ?? '', su.id);
  }

  for (const student of currentStudents) {
    const studentId = studentEmailToIdMap.get(student.id.toLowerCase());
    if (!studentId) continue;
    
    await prisma.studentEnrollment.upsert({
      where: {
        studentId_semesterId: {
          studentId,
          semesterId: defaultSemester.id,
        },
      },
      update: {
        semesterNumber: semesterNumberFromUsn(student.id, defaultSemester.startDate!) || 1,
        program: student.program,
        classGroup: student.classGroup,
      },
      create: {
        studentId,
        semesterId: defaultSemester.id,
        semesterNumber: semesterNumberFromUsn(student.id, defaultSemester.startDate!) || 1,
        program: student.program,
        classGroup: student.classGroup,
      },
    });
  }

  // Do NOT aggressively delete enrollments from default semester just because they are absent from the seed file.
  // The user rule: "Do not delete records simply because they are absent from a seed file."
  // Removed the deleteMany block that was here.
}
