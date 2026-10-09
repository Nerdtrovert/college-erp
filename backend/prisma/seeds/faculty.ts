import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedFaculty(prisma: PrismaClient) {
  // Use a secure approach: in production, initial accounts should force a password reset or use env vars
  const isProd = process.env.NODE_ENV === 'production';
  const defaultPasswordStr = process.env.DEFAULT_FACULTY_PASSWORD || (isProd ? null : 'teacher123');
  const defaultAdminPasswordStr = process.env.DEFAULT_ADMIN_PASSWORD || (isProd ? null : 'admin123');
  
  if (isProd && (!defaultPasswordStr || !defaultAdminPasswordStr)) {
    throw new Error('FATAL: Running in production without DEFAULT_FACULTY_PASSWORD or DEFAULT_ADMIN_PASSWORD set. Aborting seed to prevent missing faculty records.');
  }

  const teacherPasswordHash = await bcrypt.hash(defaultPasswordStr!, 10);
  const adminPasswordHash = await bcrypt.hash(defaultAdminPasswordStr!, 10);

  const facultyData = [
    { email: 'madhumathi@hnnce.in', name: 'Prof. Madhumathi', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'vijaya@hnnce.in', name: 'Prof. Vijaya Singh', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'nagasundara@hnnce.in', name: 'Dr. Nagasundara K B', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'bhargavi@hnnce.in', name: 'Dr. Bhargavi K S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'rajesh@hnnce.in', name: 'Prof. Rajesh M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'praveen@hnnce.in', name: 'Dr. Praveen Kumar B C', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'harshitha@hnnce.in', name: 'Prof. Harshitha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'sunil@hnnce.in', name: 'Prof. Sunil Kumar S', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'madhimatha@hnnce.in', name: 'Prof. Madhimatha', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'lashmi@hnnce.in', name: 'Prof. Lashmi A M', password: teacherPasswordHash, role: Role.teacher, department: 'Dept of CSE' },
    { email: 'archana.bk@hnnce.in', name: 'Prof. Archana B K', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'sadashiva@hnnce.in', name: 'Dr. Sadashiva V C', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'archana.s@hnnce.in', name: 'Prof. Archana S', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'ranjan@hnnce.in', name: 'Dr. B S C Ranjan', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'lakshmi@hnnce.in', name: 'Prof. Lakshmi A N', password: teacherPasswordHash, role: Role.teacher, department: 'EC' },
    { email: 'megashree@hnnce.in', name: 'Prof. Megashree', password: teacherPasswordHash, role: Role.teacher, department: 'ISE' },

    // Admins
    { email: 'deanCSE@hnnce.in', name: 'Dr. Dean Administrator', password: adminPasswordHash, role: Role.dean, department: 'Administration' },
    { email: 'hodCSE@hnnce.com', name: 'Dr Anirudh Sharma', password: adminPasswordHash, role: Role.hod, department: 'Dept of CSE' },
    { email: 'shwetha@hnnce.in', name: 'Dr. Shwetha V', password: adminPasswordHash, role: Role.hod, department: 'EC' },
    { email: 'jayadevappa@hnnce.in', name: 'Dr. D Jayadevappa', password: adminPasswordHash, role: Role.principal, department: 'Administration' },
  ];

  const facultyEmailToIdMap = new Map<string, string>();
  for (const f of facultyData) {
    const email = f.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let user;
    if (existingUser) {
      // Do NOT overwrite name or password
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: f.role,
          department: f.department
        }
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: f.name,
          password: f.password,
          role: f.role,
          department: f.department
        }
      });
    }
    facultyEmailToIdMap.set(email, user.id);
  }
  console.log('Faculty seeded and email-to-ID map built.');
  return { facultyEmailToIdMap, facultyData };
}
