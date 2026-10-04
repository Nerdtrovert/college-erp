import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCieMarkOutOf50, getCieMarkColorClass } from '../reportCieMarks';

test('scales CIE marks to a score out of 50', () => {
  assert.equal(formatCieMarkOutOf50(24, 30), '40.0');
});

test('shows missing or invalid marks as unavailable', () => {
  assert.equal(formatCieMarkOutOf50(null, 30), '-');
  assert.equal(formatCieMarkOutOf50(12, null), '-');
  assert.equal(formatCieMarkOutOf50(12, 0), '-');
});

test('colors CIE scores using the report performance thresholds', () => {
  assert.equal(getCieMarkColorClass('35.1'), 'bg-green-100 text-green-800');
  assert.equal(getCieMarkColorClass('35.0'), 'bg-yellow-100 text-yellow-800');
  assert.equal(getCieMarkColorClass('21.0'), 'bg-yellow-100 text-yellow-800');
  assert.equal(getCieMarkColorClass('20.0'), 'bg-red-100 text-red-800');
  assert.equal(getCieMarkColorClass('-'), 'bg-gray-100 text-gray-600');
});
