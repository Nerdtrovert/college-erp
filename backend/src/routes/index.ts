import { Router } from 'express';
import authRoutes from './auth.routes';
import attendanceRoutes from './attendance.routes';
import marksRoutes from './marks.routes';
import announcementRoutes from './announcement.routes';
import timetableRoutes from './timetable.routes';
import noteRoutes from './note.routes';
import semesterRoutes from './semester.routes';
import subjectRoutes from './subject.routes';
import vipRoutes from './vip.routes';
import reportsRoutes from './reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marks', marksRoutes);
router.use('/announcements', announcementRoutes);
router.use('/timetable', timetableRoutes);
router.use('/notes', noteRoutes);
router.use('/semesters', semesterRoutes);
router.use('/subjects', subjectRoutes);
router.use('/vip', vipRoutes);
router.use('/reports', reportsRoutes);

export default router;