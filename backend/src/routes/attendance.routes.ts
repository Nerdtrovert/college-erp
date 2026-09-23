import { Router } from 'express';
import {
  getStudentAttendance,
  getTeacherAttendance,
  getTeacherClasses,
  saveTeacherAttendance,
  getCorrectionSessions,
  updateAttendanceRecord,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { requireStudent, requireTeacher, requireFaculty } from '../middleware/role';
import { validate } from '../middleware/validate';
import { saveAttendanceSchema } from '../validations/attendance.validation';

const router = Router();

// Student routes
router.get('/student', authenticate, requireStudent, getStudentAttendance);

router.get('/teacher/:subjectCode', authenticate, requireTeacher, getTeacherAttendance);
router.get('/teacher-classes', authenticate, requireTeacher, getTeacherClasses);
router.post('/teacher', authenticate, requireTeacher, validate(saveAttendanceSchema), saveTeacherAttendance);
router.get('/correction-sessions', authenticate, requireFaculty, getCorrectionSessions);
router.patch('/records/:recordId', authenticate, requireFaculty, updateAttendanceRecord);

export default router;