import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subject.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();
const supervisorRoles = [Role.dean, Role.principal, Role.hod] as const;

router.get('/', authenticate, authorize(supervisorRoles), getSubjects);
router.post('/', authenticate, authorize(supervisorRoles), createSubject);
router.put('/:code', authenticate, authorize(supervisorRoles), updateSubject);
router.delete('/:code', authenticate, authorize(supervisorRoles), deleteSubject);

export default router;
