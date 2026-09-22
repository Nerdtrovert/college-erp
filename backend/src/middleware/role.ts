import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from './auth';

/**
 * Middleware to require authentication and specific role(s)
 * @param roles Single role or array of roles required
 * @returns Middleware function that authenticates then authorizes
 */
export const requireAuth = (roles: readonly string[] | string) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // First authenticate
    authenticate(req, res, (err) => {
      if (err) return next(err);
      // Then authorize
      authorize(roleArray as any)(req, res, next);
    });
  };
};

/**
 * Middleware to require teacher role
 */
export const requireTeacher = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    authorize(['teacher'] as any)(req, res, next);
  });
};

/**
 * Middleware to require supervisor role (dean, principal, hod)
 */
export const requireSupervisor = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    authorize(['dean', 'principal', 'hod'] as any)(req, res, next);
  });
};

/**
 * Middleware to require admin role (dean, principal, hod, supervisor)
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    authorize(['dean', 'principal', 'hod', 'supervisor'] as any)(req, res, next);
  });
};

/**
 * Middleware to require faculty role (teacher, dean, principal, hod)
 */
export const requireFaculty = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    authorize(['teacher', 'dean', 'principal', 'hod'] as any)(req, res, next);
  });
};

/**
 * Middleware to require student role
 */
export const requireStudent = (req: AuthRequest, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    authorize(['student'] as any)(req, res, next);
  });
};

/**
 * Middleware to require VIP roles (dean, principal, hod)
 * Alias for requireSupervisor for backward compatibility
 */
export const requireVIP = requireSupervisor;