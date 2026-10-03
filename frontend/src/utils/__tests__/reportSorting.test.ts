import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAtRiskRows, sortReportRows } from '../reportSorting';

test('excludes safe students from the at-risk report', () => {
  const rows = [
    { id: '1', vergeStatus: 'SAFE' as const, atRiskSubjects: [], numberOfBacklogs: 3 },
    { id: '2', vergeStatus: 'AT_RISK' as const, atRiskSubjects: ['BCS501'], numberOfBacklogs: 0 },
    { id: '3', vergeStatus: 'AT_RISK' as const, atRiskSubjects: [], numberOfBacklogs: 0 },
  ];

  assert.deepEqual(filterAtRiskRows(rows).map(({ id }) => id), ['2']);
});

test('sorts report rows by program, section, and student name', () => {
  const rows = [
    { id: '6', name: 'Zara', program: 'CSE', classGroup: 'CSE-B' },
    { id: '5', name: 'Zara', program: 'CSE', classGroup: 'CSE-A' },
    { id: '4', name: 'Zara', program: 'AI&DS', classGroup: 'AI&DS-A' },
    { id: '3', name: 'Aisha', program: 'CSE', classGroup: 'CSE-A' },
    { id: '2', name: 'Aarav', program: 'CSE', classGroup: 'CSE-B' },
  ];

  assert.deepEqual(
    sortReportRows(rows).map(({ id }) => id),
    ['4', '3', '5', '2', '6'],
  );
});

test('sorts names case-insensitively and numeric section suffixes naturally', () => {
  const rows = [
    { id: '2', studentName: 'bela', classGroup: 'CSE-10' },
    { id: '3', studentName: 'ALAN', classGroup: 'CSE-2' },
    { id: '1', studentName: 'Alan', classGroup: 'CSE-2' },
  ];

  assert.deepEqual(
    sortReportRows(rows).map(({ id }) => id),
    ['1', '3', '2'],
  );
});
