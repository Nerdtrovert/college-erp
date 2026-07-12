import { Router } from 'express';
import { login, register, getMe, getUsersByRole } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validations/auth.validation';
import { authenticate, authorize } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', authenticate, authorize(['dean', 'principal']), authLimiter, validate(registerSchema), register);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize(['dean', 'principal']), getUsersByRole);

export default router;
