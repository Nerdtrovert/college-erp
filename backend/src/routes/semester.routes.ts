import { Router } from 'express';
import {
  getSemesters,
  createSemester,
  updateSemester,
  getSemesterById,
  copySemester,
  promoteStudentsToSemester,
  getStudentSemestersForSemester,
  getProgramsForSemesterAndStudentSemester,
  getSectionsForSemesterStudentSemesterAndProgram,
} from '../controllers/semester.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

const supervisorRolesActual = [Role.dean, Role.principal, Role.hod] as const;

router.get('/', authenticate, authorize([...supervisorRolesActual, Role.teacher]), getSemesters);
router.post('/', authenticate, authorize(supervisorRolesActual), createSemester);
router.get('/:id', authenticate, authorize([...supervisorRolesActual, Role.teacher]), getSemesterById);
router.patch('/:id', authenticate, authorize(supervisorRolesActual), updateSemester);
router.post('/:id/copy', authenticate, authorize(supervisorRolesActual), copySemester);
router.post('/:id/promote-students', authenticate, authorize(supervisorRolesActual), promoteStudentsToSemester);

// New endpoints for timetable management cascading selectors
router.get('/:semesterId/student-semesters', authenticate, authorize([...supervisorRolesActual, Role.teacher]), getStudentSemestersForSemester);
router.get('/:semesterId/student-semesters/:studentSemesterId/programs', authenticate, authorize([...supervisorRolesActual, Role.teacher]), getProgramsForSemesterAndStudentSemester);
router.get('/:semesterId/student-semesters/:studentSemesterId/programs/:program/sections', authenticate, authorize([...supervisorRolesActual, Role.teacher]), getSectionsForSemesterStudentSemesterAndProgram);

export default router;
