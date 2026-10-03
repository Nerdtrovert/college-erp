import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCieMarkOutOf50 } from '../reportCieMarks';

test('scales CIE marks to a score out of 50', () => {
  assert.equal(formatCieMarkOutOf50(24, 30), '40.0');
});

test('shows missing or invalid marks as unavailable', () => {
  assert.equal(formatCieMarkOutOf50(null, 30), '-');
  assert.equal(formatCieMarkOutOf50(12, null), '-');
  assert.equal(formatCieMarkOutOf50(12, 0), '-');
});
