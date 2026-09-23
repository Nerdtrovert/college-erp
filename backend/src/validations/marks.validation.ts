import { z } from 'zod';
import { idSchema } from './shared.validation';

export const saveMarksSchema = z.object({
  body: z.object({
    subjectCode: idSchema(1, 'Subject code is required'),
    type: z.union([z.literal('cie1'), z.literal('cie2'), z.literal('cie3'), z.literal('assignment'), z.literal('lab')]),
    maxScore: z.number().min(0, 'Maximum score must be non-negative'),
    records: z.array(
      z.object({
        studentId: idSchema(1, 'Student ID is required'),
        score: z.number().min(0, 'Score must be non-negative').nullable().optional(), // null means pending
      })
    ).min(1, 'At least one student mark record must be provided'),
  }),
});