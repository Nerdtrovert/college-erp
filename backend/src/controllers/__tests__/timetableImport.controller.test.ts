import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFacultyName, similarityScore, findSimilarFaculty } from '../timetableImport.controller';

test('normalizeFacultyName: normalizes case and removes titles', () => {
  assert.strictEqual(normalizeFacultyName('Prof. John Doe'), 'john doe');
  assert.strictEqual(normalizeFacultyName('DR. JANE SMITH'), 'jane smith');
  assert.strictEqual(normalizeFacultyName('Professor Bob'), 'bob');
});

test('normalizeFacultyName: removes punctuation and extra whitespace', () => {
  assert.strictEqual(normalizeFacultyName('John-Doe'), 'john doe');
  assert.strictEqual(normalizeFacultyName('John  Doe'), 'john doe');
  assert.strictEqual(normalizeFacultyName('John.Doe'), 'john doe');
  assert.strictEqual(normalizeFacultyName('John\tDoe'), 'john doe');
  assert.strictEqual(normalizeFacultyName('John\\tDoe'), 'john doe');
});

test('normalizeFacultyName: handles empty strings', () => {
  assert.strictEqual(normalizeFacultyName(''), '');
  assert.strictEqual(normalizeFacultyName('   '), '');
});

test('similarityScore: exact match returns 1.0', () => {
  assert.strictEqual(similarityScore('john doe', 'john doe'), 1.0);
  assert.strictEqual(similarityScore('Prof. John Doe', 'Dr. John Doe'), 1.0);
});

test('similarityScore: completely different names return 0', () => {
  assert.strictEqual(similarityScore('john doe', 'richard roe'), 0.0);
  assert.strictEqual(similarityScore('alan turing', 'ada lovelace'), 0.0);
});

test('similarityScore: partial overlap gives partial score without concatenating multi-word names', () => {
  // 'john doe' and 'john smith': common token 'john' (1), unique tokens {'john', 'doe', 'smith'} (3) -> 1/3
  assert.strictEqual(similarityScore('john doe', 'john smith'), 1 / 3);
  assert.strictEqual(similarityScore('Prof. John Doe', 'John Smith'), 1 / 3);
});

test('similarityScore: handles empty strings', () => {
  assert.strictEqual(similarityScore('', ''), 0.0);
  assert.strictEqual(similarityScore('john', ''), 0.0);
  assert.strictEqual(similarityScore('', 'john'), 0.0);
});

test('findSimilarFaculty: returns similar faculty sorted by score', async () => {
  const mockPrisma = {
    user: {
      findMany: async () => [
        { id: '1', name: 'John Doe', department: 'CS', classGroup: 'A' },
        { id: '2', name: 'Jane Smith', department: 'Math', classGroup: 'B' },
        { id: '3', name: 'Johnny Doe', department: 'CS', classGroup: 'A' },
        { id: '4', name: 'Richard Roe', department: 'Physics', classGroup: 'C' }
      ]
    }
  } as any;

  const results = await findSimilarFaculty(mockPrisma, 'John Doe', 2);
  assert.strictEqual(Array.isArray(results), true);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].id, '1');
  assert.strictEqual(results[0].name, 'John Doe');
  assert.strictEqual(results[1].id, '3');
  assert.strictEqual(results[1].name, 'Johnny Doe');
});

test('findSimilarFaculty: returns empty array when no similar faculty or empty input', async () => {
  const mockPrisma = {
    user: {
      findMany: async () => []
    }
  } as any;
  const results = await findSimilarFaculty(mockPrisma, 'Nonexistent', 5);
  assert.strictEqual(Array.isArray(results), true);
  assert.strictEqual(results.length, 0);

  const emptyResults = await findSimilarFaculty(mockPrisma, '   ', 5);
  assert.strictEqual(Array.isArray(emptyResults), true);
  assert.strictEqual(emptyResults.length, 0);
});

test('findSimilarFaculty: respects limit parameter', async () => {
  const mockPrisma = {
    user: {
      findMany: async () => Array.from({length: 10}, (_, i) => ({
        id: String(i+1),
        name: `Faculty ${i+1}`,
        department: undefined,
        classGroup: undefined
      }))
    }
  } as any;
  const results = await findSimilarFaculty(mockPrisma, 'Faculty', 3);
  assert.strictEqual(results.length, 3);
});
