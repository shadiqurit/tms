import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { effectivePermissionKeys } from '../services/permissions.js';
import type { AuthRequest } from '../types.js';

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  company_id: number;
  role_id: number;
  role_key: string;
  role_name: string;
}

const loginSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter your email or username and password.' });

  const [rows] = await db.query<UserRow[]>(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.password_hash,
            u.company_id, r.id AS role_id, r.role_key, r.name AS role_name
       FROM app_users u
       JOIN app_roles r ON r.id = u.role_id
      WHERE (LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?))
        AND u.status = 'active'
      LIMIT 1`,
    [parsed.data.login, parsed.data.login],
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ message: 'The email/username or password is incorrect.' });
  }

  const token = jwt.sign(
    { companyId: user.company_id, roleId: user.role_id, roleKey: user.role_key, username: user.username },
    config.JWT_SECRET,
    { subject: String(user.id), expiresIn: parsed.data.remember ? '30d' : '8h' },
  );
  const permissions = await effectivePermissionKeys(user.id, user.role_id, user.role_key);

  return res.json({
    token,
    permissions,
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      username: user.username,
      email: user.email,
      role: { id: user.role_id, key: user.role_key, name: user.role_name },
    },
  });
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res) => {
  const [rows] = await db.query<UserRow[]>(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.company_id,
            r.id AS role_id, r.role_key, r.name AS role_name, '' AS password_hash
       FROM app_users u JOIN app_roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.status = 'active' LIMIT 1`,
    [req.user!.id],
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ message: 'User no longer exists.' });
  const permissions = await effectivePermissionKeys(user.id, user.role_id, user.role_key);
  return res.json({
    permissions,
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      username: user.username,
      email: user.email,
      role: { id: user.role_id, key: user.role_key, name: user.role_name },
    },
  });
});
