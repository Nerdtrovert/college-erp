import { z } from 'zod';

/**
 * Reusable ID validation schema
 * @param minLength Minimum length for the ID (default: 1)
 * @param message Error message if validation fails (default: 'ID is required')
 * @returns Zod schema for ID validation
 */
export const idSchema = (minLength: number = 1, message: string = 'ID is required') =>
  z.string().min(minLength, message);

/**
 * Reusable role validation schema
 * @param allowedRoles Array of allowed role literals
 * @param message Error message if validation fails (default: 'Invalid role')
 * @returns Zod schema for role validation
 */
export const roleSchema = (allowedRoles: readonly string[], message: string = 'Invalid role') =>
  z.union(allowedRoles.map(role => z.literal(role)));

/**
 * Reusable string field schema with length constraints
 * @param options Configuration options for the string field
 * @returns Zod schema for string field validation
 */
export const stringField = (options: {
  minLength?: number;
  maxLength?: number;
  requiredMessage?: string;
  maxLengthMessage?: string;
}) => {
  let schema = z.string();
  if (options.minLength !== undefined) {
    schema = schema.min(options.minLength, options.requiredMessage || `Field must be at least ${options.minLength} characters`);
  }
  if (options.maxLength !== undefined) {
    schema = schema.max(options.maxLength, options.maxLengthMessage || `Field cannot exceed ${options.maxLength} characters`);
  }
  return schema;
};

/**
 * Reusable date string schema (YYYY-MM-DD format)
 * @returns Zod schema for date string validation
 */
export const dateStringSchema = () =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Predefined role schemas for common use cases
 */
export const roleSchemas = {
  // Common roles in the system
  student: roleSchema(['student']),
  teacher: roleSchema(['teacher']),
  dean: roleSchema(['dean']),
  principal: roleSchema(['principal']),
  hod: roleSchema(['hod']),
  supervisor: roleSchema(['supervisor']),

  // Combined roles
  studentOrTeacher: roleSchema(['student', 'teacher']),
  faculty: roleSchema(['teacher', 'dean', 'principal', 'hod']),
  admin: roleSchema(['dean', 'principal', 'hod', 'supervisor']),

  // All roles
  all: roleSchema(['student', 'teacher', 'dean', 'principal', 'hod', 'supervisor'])
};

/**
 * Common string field schemas
 */
export const commonStringFields = {
  // Name fields
  name: stringField({ minLength: 1, requiredMessage: 'Name is required' }),

  // Department fields
  department: stringField({ minLength: 1, requiredMessage: 'Department is required' }),

  // Title fields (for announcements, notes, etc.)
  title: stringField({
    minLength: 1,
    maxLength: 200,
    requiredMessage: 'Title is required',
    maxLengthMessage: 'Title cannot exceed 200 characters'
  }),

  // Description fields
  description: stringField({
    maxLength: 1000,
    maxLengthMessage: 'Description cannot exceed 1000 characters'
  }),
};

/**
 * Common ID field schemas
 */
export const commonIdFields = {
  // User ID (roll number or faculty ID)
  userId: idSchema(1, 'User ID (roll number or faculty ID) is required'),

  // User ID with minimum length (for registration)
  userIdMin3: idSchema(3, 'User ID must be at least 3 characters'),

  // Semester ID
  semesterId: idSchema(1, 'Semester ID is required'),

  // Subject code
  subjectCode: idSchema(1, 'Subject code is required'),
};