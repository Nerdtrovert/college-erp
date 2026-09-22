import { z } from 'zod';
import { idSchema, stringField, commonStringFields } from './shared.validation';

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: commonStringFields.title,
    body: stringField({ minLength: 1, requiredMessage: 'Description/body is required' }),
    category: z.union([z.literal('exam'), z.literal('info'), z.literal('event')]),
    target: idSchema(1, 'Target audience (e.g. class group name or "all") is required'),
    pinned: z.boolean().optional().default(false),
  }),
});