import { Router } from 'express';
import {
  getStudentTimetable,
  getTeacherTimetable,
  getTeacherSubjects,
  getTimetableBySemester,
  saveTimetableSlot,
} from '../controllers/timetable.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/student', authenticate, authorize(['student']), getStudentTimetable);
router.get('/teacher', authenticate, authorize(['teacher']), getTeacherTimetable);
router.get('/teacher-subjects', authenticate, authorize(['teacher']), getTeacherSubjects);
router.get('/semester/:semesterId', authenticate, authorize(['teacher', 'dean', 'principal']), getTimetableBySemester);
router.put('/slot', authenticate, authorize(['dean', 'principal']), saveTimetableSlot);

export default router;
