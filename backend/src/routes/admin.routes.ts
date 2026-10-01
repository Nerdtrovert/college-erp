import { Router } from 'express';
import { adminLogin, downloadAdminLogs, getAdminLogs, createAdminUpload } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { authLimiter } from '../middleware/rateLimit';
import { upload } from '../config/multer';
import { validate } from '../middleware/validate';
import { createAdminUploadSchema } from '../validations/admin.upload.validation';

const router = Router();

router.post('/login', authLimiter, adminLogin);
router.get('/logs', authenticate, requireAdmin, getAdminLogs);
router.get('/logs/download', authenticate, requireAdmin, downloadAdminLogs);
router.post('/upload', authenticate, requireAdmin, upload.single('file'), validate(createAdminUploadSchema), createAdminUpload);

export default router;
