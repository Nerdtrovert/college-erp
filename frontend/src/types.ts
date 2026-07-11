export type Role = 'student' | 'teacher';

export interface User {
  role: Role;
  name: string;
  id: string;
  department: string;
}