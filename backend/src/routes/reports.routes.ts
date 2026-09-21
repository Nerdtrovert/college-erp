import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import * as reportsController from '../controllers/reports.controller';

const router = Router();

// Apply authentication to all report routes
router.use(authenticate);

// Get verge of backlog report
// Accessible by: teachers (for their students), hod, principal, dean (with filtering)
router.get('/verge-of-backlog', authorize(['hod', 'principal', 'dean', 'teacher']), reportsController.getVergeOfBacklogReport);

// Update student backlogs
router.put('/backlogs/:studentId', authorize(['hod', 'principal', 'dean', 'teacher']), reportsController.updateBacklogs);

export default router;