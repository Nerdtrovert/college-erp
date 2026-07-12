import { Router } from 'express';
import {
  getSemesters,
  createSemester,
  updateSemester,
  getSemesterById,
  copySemester,
} from '../controllers/semester.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

const supervisorRolesActual = [Role.dean, Role.principal] as const;

router.get('/', authenticate, authorize(supervisorRolesActual), getSemesters);
router.post('/', authenticate, authorize(supervisorRolesActual), createSemester);
router.get('/:id', authenticate, authorize(supervisorRolesActual), getSemesterById);
router.patch('/:id', authenticate, authorize(supervisorRolesActual), updateSemester);
router.post('/:id/copy', authenticate, authorize(supervisorRolesActual), copySemester);

export default router;
