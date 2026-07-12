import { Router } from 'express';
import {
  getStudentAttendance,
  getTeacherAttendance,
  saveTeacherAttendance,
} from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { saveAttendanceSchema } from '../validations/attendance.validation';

const router = Router();

// Student routes
router.get('/student', authenticate, authorize(['student']), getStudentAttendance);

// Teacher routes
router.get('/teacher/:subjectCode', authenticate, authorize(['teacher']), getTeacherAttendance);
router.post('/teacher', authenticate, authorize(['teacher']), validate(saveAttendanceSchema), saveTeacherAttendance);

export default router;
