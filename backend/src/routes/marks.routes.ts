import { Router } from 'express';
import {
  getStudentMarks,
  getTeacherMarks,
  saveTeacherMarks,
} from '../controllers/marks.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { saveMarksSchema } from '../validations/marks.validation';

const router = Router();

// Student routes
router.get('/student', authenticate, authorize(['student']), getStudentMarks);

// Teacher routes
router.get('/teacher/:subjectCode/:assessmentType', authenticate, authorize(['teacher']), getTeacherMarks);
router.post('/teacher', authenticate, authorize(['teacher']), validate(saveMarksSchema), saveTeacherMarks);

export default router;
