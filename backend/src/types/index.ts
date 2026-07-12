import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JWTPayload {
  id: string;
  role: Role;
  name: string;
  department: string;
  classGroup?: string | null;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
