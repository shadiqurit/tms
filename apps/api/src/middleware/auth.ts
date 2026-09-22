import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthRequest, JwtPayload } from '../types.js';
import { hasEffectivePermission } from '../services/permissions.js';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as unknown as JwtPayload;
    req.user = {
      id: Number(payload.sub),
      companyId: payload.companyId,
      roleId: payload.roleId,
      roleKey: payload.roleKey,
      username: payload.username,
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
}

export function requirePermission(permissionKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    const allowed = await hasEffectivePermission(
      req.user.id,
      req.user.roleId,
      req.user.roleKey,
      permissionKey,
    );
    if (!allowed) return res.status(403).json({ message: 'You do not have permission for this action.' });
    next();
  };
}
