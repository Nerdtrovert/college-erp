import { z } from 'zod';
import { idSchema, dateStringSchema, roleSchemas } from './shared.validation';

export const saveAttendanceSchema = z.object({
  body: z.object({
    subjectCode: idSchema(1, 'Subject code is required'),
    date: dateStringSchema(),
    classGroup: idSchema(1, 'Class group is required'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:mm'),
    room: z.string().trim().max(100).optional(),
    records: z.array(
      z.object({
        studentId: idSchema(1, 'Student ID is required'),
        status: z.union([z.literal('present'), z.literal('absent')]),
      })
    ).min(1, 'At least one student attendance status must be provided'),
  }),
});