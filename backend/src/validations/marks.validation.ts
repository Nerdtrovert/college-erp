import { z } from 'zod';

export const saveMarksSchema = z.object({
  body: z.object({
    subjectCode: z.string().min(1, 'Subject code is required'),
    type: z.union([z.literal('ia1'), z.literal('ia2'), z.literal('assignment'), z.literal('lab')]),
    maxScore: z.number().min(0, 'Maximum score must be non-negative'),
    records: z.array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        score: z.number().min(0, 'Score must be non-negative').nullable().optional(), // null means pending
      })
    ).min(1, 'At least one student mark record must be provided'),
  }),
});
