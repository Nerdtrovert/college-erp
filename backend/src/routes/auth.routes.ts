import { Router } from 'express';
import { login, register, getMe, getUsersByRole, updateUser, deleteUser, uploadStudents } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validations/auth.validation';
import { authenticate, authorize } from '../middleware/auth';
import { authLimiter, uploadLimiter } from '../middleware/rateLimit';
import { studentUpload } from '../config/multer';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', authenticate, authorize(['dean', 'principal', 'hod']), authLimiter, validate(registerSchema), register);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize(['dean', 'principal', 'hod']), getUsersByRole);
router.patch('/users/:id', authenticate, authorize(['dean', 'principal', 'hod']), updateUser);
router.delete('/users/:id', authenticate, authorize(['dean', 'principal', 'hod']), deleteUser);

// Student bulk upload from file (Excel, Word, PDF)
router.post('/students/upload', authenticate, authorize(['dean', 'principal', 'hod']), uploadLimiter, studentUpload.single('file'), uploadStudents);

export default router;
