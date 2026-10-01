export const STUDENT_PROGRAMS = ['CSE', 'ISE', 'AI&DS', 'ECE'] as const;

export type StudentProgram = typeof STUDENT_PROGRAMS[number];

export const isStudentProgram = (value: unknown): value is StudentProgram =>
  typeof value === 'string' && (STUDENT_PROGRAMS as readonly string[]).includes(value);

export const programFromLegacyDepartment = (department: string | null | undefined): StudentProgram | null => {
  const normalized = department?.trim().toLowerCase() || '';

  if (normalized.includes('cse') || normalized.includes('computer science')) return 'CSE';
  if (normalized.includes('ise') || normalized.includes('information science')) return 'ISE';
  if (normalized.includes('ai') || normalized.includes('artificial intelligence')) return 'AI&DS';
  if (normalized.includes('ece') || normalized.includes('electronics') || normalized === 'ec') return 'ECE';

  return null;
};

export const sectionMatchesProgram = (program: string, classGroup: string): boolean =>
  classGroup.trim().toUpperCase().startsWith(`${program.toUpperCase()}-`);

export const programFromSection = (classGroup: string | null | undefined): StudentProgram | null => {
  const prefix = classGroup?.trim().toUpperCase().split('-')[0];
  return isStudentProgram(prefix) ? prefix : null;
};
