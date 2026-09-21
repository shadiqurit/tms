import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthRequest, JwtPayload } from '../types.js';

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
    if (req.user.roleKey === 'programmer') return next();

    const { db } = await import('../db.js');
    const [rows] = await db.query<mysql.RowDataPacket[]>(
      `SELECT 1
         FROM app_role_permissions rp
         JOIN app_permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ? AND p.permission_key = ? AND rp.allowed = 1
        LIMIT 1`,
      [req.user.roleId, permissionKey],
    );
    if (rows.length === 0) return res.status(403).json({ message: 'You do not have permission for this action.' });
    next();
  };
}

import type mysql from 'mysql2/promise';
