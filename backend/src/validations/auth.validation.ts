import { z } from 'zod';
import { idSchema, roleSchema, stringField, roleSchemas, commonIdFields, commonStringFields } from './shared.validation';

export const loginSchema = z.object({
  body: z.object({
    id: commonIdFields.userId,
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).superRefine((value, ctx) => {
    const isStudent = !value.id.includes('@');
    const validIdentifier = isStudent
      ? /^1HC\d{2}[A-Z]{2}\d{3}$/.test(value.id)  // Case sensitive for USN
      : /^[a-zA-Z0-9._%+-]+@hnnce\.in$/i.test(value.id);  // More specific email pattern

    if (!validIdentifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: 'Invalid USN or @hnnce.in email format',
      });
    }
  }),
});

export const registerSchema = z.object({
  body: z.object({
    id: commonIdFields.userIdMin3,
    name: commonStringFields.name,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: roleSchemas.all, // student or teacher
    department: commonStringFields.department,
    classGroup: z.string().optional(),
    numberOfBacklogs: z.number().int().min(0).optional(),
    backlogSubjects: z.array(z.string()).optional(),
  }).superRefine((value, ctx) => {
    const isStudent = value.role === 'student';
    const validIdentifier = isStudent
      ? /^1HC\d{2}[A-Z]{2}\d{3}$/.test(value.id)  // Case sensitive for USN
      : /^[a-zA-Z0-9._%+-]+@hnnce\.in$/i.test(value.id);  // More specific email pattern

    if (!validIdentifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: isStudent
          ? 'Student ID must be a USN such as 1HC24CS001'
          : 'Faculty and supervisor ID must be an @hnnce.in email address',
      });
    }

    if (isStudent && !value.classGroup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['classGroup'],
        message: 'Class group is required for students',
      });
    }
  }),
});