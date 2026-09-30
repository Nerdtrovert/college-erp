import { Router } from 'express';
import {
  uploadGradecard,
  processGradecard,
  getStudentsWithBacklogs
} from '../controllers/backlog.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication and authorization for dean, principal, or hod
router.use(authenticate);
router.use(authorize(['dean', 'principal', 'hod']));

// Upload gradecard document (PDF/Excel/Word)
router.post('/upload', uploadGradecard);

// Process gradecard data and update student backlogs
router.post('/process', processGradecard);

// Get all students with their backlog information for a semester
router.get('/students', getStudentsWithBacklogs);

export default router;