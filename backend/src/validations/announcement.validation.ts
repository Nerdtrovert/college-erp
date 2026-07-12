import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
    body: z.string().min(1, 'Description/body is required'),
    category: z.union([z.literal('exam'), z.literal('info'), z.literal('event')]),
    target: z.string().min(1, 'Target audience (e.g. class group name or "all") is required'),
    pinned: z.boolean().optional().default(false),
  }),
});
