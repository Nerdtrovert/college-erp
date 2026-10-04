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
import {
  parseTimetable,
  importTimetable
} from '../controllers/timetableImport.controller';
import { authenticate, authorize } from '../middleware/auth';
import { requireTeacher } from '../middleware/role';

const router = Router();

// Existing timetable routes
router.get('/student', authenticate, authorize(['student']), getStudentTimetable);
router.get('/teacher', requireTeacher, getTeacherTimetable);
router.get('/teacher-subjects', requireTeacher, getTeacherSubjects);
router.get('/semester/:semesterId', authenticate, authorize(['teacher', 'dean', 'principal', 'hod']), getTimetableBySemester);
router.get('/semester/:semesterId/classes', authenticate, authorize(['dean', 'principal', 'hod']), getTimetableClassGroups);
router.put('/slot', authenticate, authorize(['dean', 'principal', 'hod']), saveTimetableSlot);
router.get('/faculty/:teacherId', authenticate, authorize(['dean', 'principal', 'hod']), getAnyFacultyTimetable);
router.get('/faculty-status', authenticate, authorize(['dean', 'principal', 'hod']), getCurrentFacultyStatus);

// New timetable import/parse routes
router.post('/parse', authenticate, authorize(['dean', 'principal', 'hod']), parseTimetable);
router.post('/import', authenticate, authorize(['dean', 'principal', 'hod']), importTimetable);

export default router;
