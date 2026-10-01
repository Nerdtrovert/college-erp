export const STUDENT_PROGRAMS = ['CSE', 'ISE', 'AI&DS', 'ECE'] as const;

export type StudentProgram = typeof STUDENT_PROGRAMS[number];

export const PROGRAM_LABELS: Record<StudentProgram, string> = {
  CSE: 'Computer Science & Engineering (CSE)',
  ISE: 'Information Science & Engineering (ISE)',
  'AI&DS': 'Artificial Intelligence & Data Science (AI&DS)',
  ECE: 'Electronics & Communication Engineering (ECE)',
};

export const SECTION_OPTIONS: Record<StudentProgram, string[]> = {
  CSE: ['CSE-A', 'CSE-B', 'CSE'],
  ISE: ['ISE'],
  'AI&DS': ['AI&DS-A', 'AI&DS-B'],
  ECE: ['ECE'],
};
