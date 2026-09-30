import { Router } from 'express';
import {
  getStudentTimetable,
  getTeacherTimetable,
  getTeacherSubjects,
  getTimetableBySemester,
  getTimetableClassGroups,
  saveTimetableSlot,
  getAnyFacultyTimetable,
  getCurrentFacultyStatus,
} from '../controllers/timetable.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/student', authenticate, authorize(['student']), getStudentTimetable);
router.get('/teacher', authenticate, authorize(['teacher']), getTeacherTimetable);
router.get('/teacher-subjects', authenticate, authorize(['teacher']), getTeacherSubjects);
router.get('/semester/:semesterId', authenticate, authorize(['teacher', 'dean', 'principal', 'hod']), getTimetableBySemester);
router.get('/semester/:semesterId/classes', authenticate, authorize(['dean', 'principal', 'hod']), getTimetableClassGroups);
router.put('/slot', authenticate, authorize(['dean', 'principal', 'hod']), saveTimetableSlot);
router.get('/faculty/:teacherId', authenticate, authorize(['dean', 'principal', 'hod']), getAnyFacultyTimetable);
router.get('/faculty-status', authenticate, authorize(['dean', 'principal', 'hod']), getCurrentFacultyStatus);

export default router;
