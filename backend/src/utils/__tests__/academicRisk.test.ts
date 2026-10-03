import assert from 'node:assert/strict';
import test from 'node:test';
import { isSubjectAtRisk } from '../academicRisk';

test('does not mark unentered assessments as at risk', () => {
  assert.equal(isSubjectAtRisk('STANDALONE', null, null), false);
  assert.equal(isSubjectAtRisk('INTEGRATED', null, null), false);
});

test('uses the displayed standalone and integrated CIE scales', () => {
  assert.equal(isSubjectAtRisk('STANDALONE', 25.9, null), true);
  assert.equal(isSubjectAtRisk('STANDALONE', 26, null), false);
  assert.equal(isSubjectAtRisk('INTEGRATED', 43.3, null), true);
  assert.equal(isSubjectAtRisk('INTEGRATED', 43.34, null), false);
});

test('only evaluates an integrated lab after a score has been entered', () => {
  assert.equal(isSubjectAtRisk('INTEGRATED', 50, null), false);
  assert.equal(isSubjectAtRisk('INTEGRATED', 50, 11), true);
  assert.equal(isSubjectAtRisk('INTEGRATED', 50, 12), false);
  assert.equal(isSubjectAtRisk('STANDALONE', 50, 0), false);
});
