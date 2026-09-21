import type { Request } from 'express';

export interface SessionUser {
  id: number;
  companyId: number;
  roleId: number;
  roleKey: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: SessionUser;
}

export interface JwtPayload {
  sub: number;
  companyId: number;
  roleId: number;
  roleKey: string;
  username: string;
}
