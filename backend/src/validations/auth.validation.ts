import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    id: z.string().min(1, 'User ID (roll number or faculty ID) is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.union([z.literal('student'), z.literal('teacher'), z.literal('supervisor')]),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    id: z.string().min(3, 'User ID must be at least 3 characters'),
    name: z.string().min(1, 'Name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.union([z.literal('student'), z.literal('teacher'), z.literal('dean'), z.literal('principal')]),
    department: z.string().min(1, 'Department is required'),
    classGroup: z.string().optional(),
  }),
});
