import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JWTPayload {
  id: string;
  email?: string | null;
  role: Role | 'admin';
  name: string;
  department?: string | null;
  program?: string | null;
  classGroup?: string | null;
  batchStartYear?: number | null;
  batchEndYear?: number | null;
  semesterId?: string | null;
  isActive?: boolean;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
