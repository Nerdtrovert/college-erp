import prisma from '../prisma/client';

export class SemesterService {
  /**
   * Get the currently active semester
   * @returns Promise resolving to the active semester or null if none found
   */
  async getActiveSemester() {
    return await prisma.semester.findFirst({
      where: {
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Get semester by ID
   * @param id Semester ID
   * @returns Promise resolving to the semester or null if not found
   */
  async getSemesterById(id: string) {
    return await prisma.semester.findUnique({
      where: { id }
    });
  }

  /**
   * Get all semesters
   * @returns Promise resolving to array of all semesters
   */
  async getAllSemesters() {
    return await prisma.semester.findMany({
      orderBy: {
        startDate: 'desc'
      }
    });
  }
}

// Export a singleton instance
export const semesterService = new SemesterService();