import { z } from 'zod';
import { idSchema, roleSchema, stringField, roleSchemas, commonIdFields, commonStringFields } from './shared.validation';
import { sectionMatchesProgram, STUDENT_PROGRAMS } from '../constants/program';

export const loginSchema = z.object({
  body: z.object({
    email: commonIdFields.userId,
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).superRefine((value, ctx) => {
    const isStudent = !value.email.includes('@');
    const validIdentifier = isStudent
      ? /^1HC\d{2}[A-Z]{2}\d{3}$/i.test(value.email)  // Case-insensitive for USN
      : /^[a-zA-Z0-9._%+-]+@hnnce\.(in|com)$/i.test(value.email);  // More specific email pattern

    if (!validIdentifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Invalid USN or @hnnce.in/com email format',
      });
    }
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: commonIdFields.userIdMin3,
    name: commonStringFields.name,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: roleSchemas.all, // student or teacher
    department: commonStringFields.department.optional(),
    program: z.enum(STUDENT_PROGRAMS).optional(),
    classGroup: z.string().optional(),
    semesterId: z.string().nullable().optional(),
    numberOfBacklogs: z.number().int().min(0).optional(),
    backlogSubjects: z.array(z.string()).optional(),
  }).superRefine((value, ctx) => {
    const isStudent = value.role === 'student';
    const validIdentifier = isStudent
      ? /^1HC\d{2}[A-Z]{2}\d{3}$/i.test(value.email)  // Case-insensitive for USN
      : /^[a-zA-Z0-9._%+-]+@hnnce\.(in|com)$/i.test(value.email);  // More specific email pattern

    if (!validIdentifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: isStudent
          ? 'Student ID must be a USN such as 1HC24CS001'
          : 'Faculty and supervisor ID must be an @hnnce.in or @hnnce.com email address',
      });
    }

    if (isStudent && !value.classGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['classGroup'],
        message: 'Class group is required for students',
      });
    }

    if (!isStudent && !value.department) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['department'],
        message: 'Department is required for faculty and supervisors',
      });
    }

    if (isStudent && value.department) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['department'],
        message: 'Department is only used for faculty and supervisors',
      });
    }

    if (!isStudent && (value.program !== undefined || value.classGroup !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['program'],
        message: 'Program and class group are only used for students',
      });
    }

    if (isStudent && !value.program) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['program'],
        message: 'Program is required for students',
      });
    }

    if (isStudent && value.program && value.classGroup && !sectionMatchesProgram(value.program, value.classGroup)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['classGroup'],
        message: `Section must belong to the selected ${value.program} program`,
      });
    }
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: commonIdFields.userIdMin3,
  }),
  body: z.object({
    name: commonStringFields.name.optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role: roleSchemas.all.optional(),
    department: commonStringFields.department.optional(),
    program: z.enum(STUDENT_PROGRAMS).optional(),
    classGroup: z.string().trim().min(1).optional(),
    semesterId: z.string().nullable().optional(),
  }),
});