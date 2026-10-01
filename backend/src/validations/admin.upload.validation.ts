import { z } from 'zod';
import { idSchema, stringField, commonStringFields } from './shared.validation';

export const createAdminUploadSchema = z.object({
  body: z.object({
    title: commonStringFields.title,
    description: stringField({
      maxLength: 1000,
      maxLengthMessage: 'Description must be less than 1000 characters'
    }).optional(),
  }),
  // Express file upload handling - file is accessed via req.file, not req.body
});

export type CreateAdminUploadInput = z.infer<typeof createAdminUploadSchema>['body'];