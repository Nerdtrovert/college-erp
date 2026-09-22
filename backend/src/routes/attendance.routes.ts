import { Router } from 'express';
import {
  getStudentAttendance,
  getTeacherAttendance,
  getTeacherClasses,
  saveTeacherAttendance,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { requireStudent } from '../middleware/role';
import { requireTeacher } from '../middleware/role';
import { validate } from '../middleware/validate';
import { saveAttendanceSchema } from '../validations/attendance.validation';

const router = Router();

// Student routes
router.get('/student', authenticate, requireStudent, getStudentAttendance);

router.get('/teacher/:subjectCode', authenticate, requireTeacher, getTeacherAttendance);
router.get('/teacher-classes', authenticate, requireTeacher, getTeacherClasses);
router.post('/teacher', authenticate, requireTeacher, validate(saveAttendanceSchema), saveTeacherAttendance);

export default router;