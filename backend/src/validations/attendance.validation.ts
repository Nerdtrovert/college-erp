import { z } from 'zod';

export const saveAttendanceSchema = z.object({
  body: z.object({
    subjectCode: z.string().min(1, 'Subject code is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    classGroup: z.string().min(1, 'Class group is required'),
    records: z.array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        status: z.union([z.literal('present'), z.literal('absent')]),
      })
    ).min(1, 'At least one student attendance status must be provided'),
  }),
});
