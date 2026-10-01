export const STUDENT_PROGRAMS = ['CSE', 'ISE', 'AI&DS', 'ECE'] as const;

export type StudentProgram = typeof STUDENT_PROGRAMS[number];

export const batchYearsFromUsn = (usn: string): { startYear: number; endYear: number } | null => {
  const match = usn.toUpperCase().match(/^1HC(\d{2})/);
  if (!match) return null;
  const startYear = 2000 + Number(match[1]);
  return { startYear, endYear: startYear + 4 };
};

export const semesterNumberFromUsn = (
  usn: string,
  semesterStartDate: string | Date,
): number | null => {
  const match = usn.toUpperCase().match(/^1HC(\d{2})/);
  if (!match) return null;

  const cohortYear = 2000 + Number(match[1]);
  const startDate = new Date(semesterStartDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const term = startDate.getMonth() >= 6 ? 'odd' : 'even';
  // January-June belongs to the academic year that began in the previous
  // calendar year, so every cohort starts in that year's odd semester.
  const academicYearStart = startDate.getFullYear() - (term === 'even' ? 1 : 0);
  const completedYears = academicYearStart - cohortYear;
  if (completedYears < 0) return null;

  const semester = completedYears * 2 + (term === 'odd' ? 1 : 2);
  return semester >= 1 && semester <= 8 ? semester : null;
};

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

export const sectionMatchesProgram = (program: string, classGroup: string): boolean => {
  const normalizedProgram = program.trim().toUpperCase();
  const normalizedGroup = classGroup.trim().toUpperCase();
  return normalizedProgram === 'CSE'
    ? normalizedGroup === 'CSE' || normalizedGroup.startsWith('CSE-')
    : normalizedGroup === normalizedProgram || normalizedGroup.startsWith(`${normalizedProgram}-`);
};

export const programFromSection = (classGroup: string | null | undefined): StudentProgram | null => {
  const prefix = classGroup?.trim().toUpperCase().split('-')[0];
  return isStudentProgram(prefix) ? prefix : null;
};
