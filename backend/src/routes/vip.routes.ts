import { Router } from 'express';
import {
  getAllStudents,
  getStudentById,
  updateStudent,
  downloadStudentsReport,
  downloadFacultyMarksReport,
  getLeaderboardByDept,
  getLeaderboardByClass,
  getLeaderboardBatch,
  getActiveSessions,
  terminateSession,
  getAPIUsageStats,
} from '../controllers/vip.controller';
import { authenticate } from '../middleware/auth';
import { requireVIP } from '../middleware/role';

const router = Router();

// All VIP endpoints require authentication and VIP authorization
router.use(authenticate);
router.use(requireVIP);

// Student management
router.get('/students', getAllStudents);
router.get('/students/report', downloadStudentsReport);
router.get('/students/:id', getStudentById);
router.put('/students/:id', updateStudent);
router.get('/faculty-marks-report', downloadFacultyMarksReport);

// Session management (VIP only)
router.get('/sessions', getActiveSessions);
router.delete('/sessions/:sessionId', terminateSession);

// API usage statistics (VIP only)
router.get('/api-stats', getAPIUsageStats);

// Leaderboards
router.get('/leaderboard/dept', getLeaderboardByDept);
router.get('/leaderboard/class', getLeaderboardByClass);
router.get('/leaderboard/batch', getLeaderboardBatch);

export default router;