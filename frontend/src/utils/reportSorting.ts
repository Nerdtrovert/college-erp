export interface SortableReportRow {
  id?: string | null;
  studentId?: string | null;
  name?: string | null;
  studentName?: string | null;
  program?: string | null;
  classGroup?: string | null;
  subjectCode?: string | null;
}

export interface AcademicRiskReportRow extends SortableReportRow {
  vergeStatus?: 'SAFE' | 'AT_RISK';
  atRiskSubjects?: string[];
}

const reportCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export const filterAtRiskRows = <T extends AcademicRiskReportRow>(rows: T[]): T[] =>
  rows.filter((row) => row.vergeStatus === 'AT_RISK' && (row.atRiskSubjects?.length ?? 0) > 0);

export const sortReportRows = <T extends SortableReportRow>(rows: T[]): T[] =>
  [...rows].sort((left, right) => {
    const leftProgram = left.program || left.classGroup?.split('-')[0] || '';
    const rightProgram = right.program || right.classGroup?.split('-')[0] || '';
    const programOrder = reportCollator.compare(leftProgram, rightProgram);
    if (programOrder !== 0) return programOrder;

    const sectionOrder = reportCollator.compare(left.classGroup || '', right.classGroup || '');
    if (sectionOrder !== 0) return sectionOrder;

    const nameOrder = reportCollator.compare(
      left.name || left.studentName || '',
      right.name || right.studentName || '',
    );
    if (nameOrder !== 0) return nameOrder;

    const studentIdOrder = reportCollator.compare(
      left.id || left.studentId || '',
      right.id || right.studentId || '',
    );
    return studentIdOrder !== 0
      ? studentIdOrder
      : reportCollator.compare(left.subjectCode || '', right.subjectCode || '');
  });
