import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateProjectedSgpa } from '../projectedSgpa';

test('projects this semester SGPA from available internal marks', () => {
  const sgpa = calculateProjectedSgpa([
    {
      type: 'STANDALONE',
      marks: [
        { type: 'cie1', score: 20 },
        { type: 'cie2', score: 30 },
        { type: 'assignment', score: 25 },
      ],
    },
    {
      type: 'INTEGRATED',
      marks: [
        { type: 'cie1', score: 20 },
        { type: 'assignment1', score: 8 },
        { type: 'assignment2', score: 10 },
        { type: 'lab', score: 25 },
      ],
    },
  ]);

  assert.equal(sgpa, '8.6');
});

test('returns zero projection when no assessments have been entered', () => {
  assert.equal(calculateProjectedSgpa([
    { type: 'STANDALONE', marks: [{ type: 'cie1', score: null }] },
  ]), '0.0');
});
