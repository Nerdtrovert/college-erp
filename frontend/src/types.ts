export type Role = 'student' | 'teacher' | 'dean' | 'principal' | 'hod';
export type SignInRole = 'student' | 'teacher' | 'supervisor';
export type StudentProgram = 'CSE' | 'ISE' | 'AI&DS' | 'ECE';

export interface User {
  role: Role;
  name: string;
  id: string;
  department?: string | null;
  program?: StudentProgram;
  classGroup?: string;
}
