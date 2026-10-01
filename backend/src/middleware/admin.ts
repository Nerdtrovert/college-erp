import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin' || req.user.id !== (process.env.ADMIN_USERNAME || 'adminHNNCE')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
