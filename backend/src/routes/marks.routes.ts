import { Router } from 'express';
import {
  getStudentMarks,
  getTeacherMarks,
  exportTeacherMarks,
  saveTeacherMarks,
} from '../controllers/marks.controller';
import { authenticate } from '../middleware/auth';
import { requireStudent } from '../middleware/role';
import { requireTeacher } from '../middleware/role';
import { validate } from '../middleware/validate';
import { saveMarksSchema } from '../validations/marks.validation';

const router = Router();

// Student routes
router.get('/student', authenticate, requireStudent, getStudentMarks);

// Teacher routes
router.get('/teacher/:subjectCode/:assessmentType', authenticate, requireTeacher, getTeacherMarks);
router.get('/teacher/:subjectCode/:assessmentType/export', authenticate, requireTeacher, exportTeacherMarks);
router.post('/teacher', authenticate, requireTeacher, validate(saveMarksSchema), saveTeacherMarks);

export default router;