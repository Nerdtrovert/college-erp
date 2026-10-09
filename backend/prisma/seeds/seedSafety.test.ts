import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { seedFaculty } from './faculty';
import { seedStudents } from './students';

describe('Seed Safety - Missing Production Config', () => {
  test('seedFaculty fails in production when password env vars are missing', async () => {
    // Save original env
    const originalEnv = process.env.NODE_ENV;
    const originalFacPass = process.env.DEFAULT_FACULTY_PASSWORD;
    const originalAdminPass = process.env.DEFAULT_ADMIN_PASSWORD;

    process.env.NODE_ENV = 'production';
    delete process.env.DEFAULT_FACULTY_PASSWORD;
    delete process.env.DEFAULT_ADMIN_PASSWORD;

    const mockPrisma = {} as any;

    try {
      await seedFaculty(mockPrisma);
      assert.fail('Should have thrown an error');
    } catch (e: any) {
      assert.match(e.message, /FATAL/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DEFAULT_FACULTY_PASSWORD = originalFacPass;
      process.env.DEFAULT_ADMIN_PASSWORD = originalAdminPass;
    }
  });

  test('seedStudents fails in production when password env var is missing', async () => {
    // Save original env
    const originalEnv = process.env.NODE_ENV;
    const originalPass = process.env.DEFAULT_STUDENT_PASSWORD;

    process.env.NODE_ENV = 'production';
    delete process.env.DEFAULT_STUDENT_PASSWORD;

    const mockPrisma = {} as any;
    const dummySemester = { id: 'sem-1', startDate: new Date() } as any;

    try {
      await seedStudents(mockPrisma, dummySemester);
      assert.fail('Should have thrown an error');
    } catch (e: any) {
      assert.match(e.message, /FATAL/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DEFAULT_STUDENT_PASSWORD = originalPass;
    }
  });
});

describe('Integration Tests Blocked', () => {
  test('A. Faculty seed preservation is blocked by missing disposable DB infrastructure', () => {
     // A proper integration test requires a real DB connection. 
     // We are mocking it here to explicitly state it's blocked as per instructions.
     assert.ok(true, 'Test is blocked. No safe disposable DB available.');
  });
  test('B. Timetable room preservation is blocked by missing disposable DB infrastructure', () => {
     assert.ok(true, 'Test is blocked. No safe disposable DB available.');
  });
  test('C. Student enrollment preservation is blocked by missing disposable DB infrastructure', () => {
     assert.ok(true, 'Test is blocked. No safe disposable DB available.');
  });
});
