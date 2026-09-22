import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

const statusSchema = z.enum(['active', 'inactive', 'locked']);
const baseUserSchema = z.object({
  username: z.string().trim().min(3).max(50),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().max(120),
  roleId: z.number().int().positive(),
  status: statusSchema.default('active'),
  projectIds: z.array(z.number().int().positive()).default([]),
});
const createUserSchema = baseUserSchema.extend({ password: z.string().min(8).max(100) });
const updateUserSchema = baseUserSchema.extend({ password: z.string().min(8).max(100).optional() });

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/', requirePermission('admin.users.view'), async (req: AuthRequest, res) => {
  const [users] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.username, u.first_name AS firstName, u.last_name AS lastName, u.email, u.status,
            u.role_id AS roleId, r.role_key AS roleKey, r.name AS roleName,
            u.last_login_at AS lastLoginAt, u.created_at AS createdAt
       FROM app_users u
       JOIN app_roles r ON r.id = u.role_id
      WHERE u.company_id = ?
      ORDER BY u.first_name, u.last_name, u.username`,
    [req.user!.companyId],
  );
  const [assignments] = await db.query<RowDataPacket[]>(
    `SELECT up.user_id AS userId, up.project_id AS projectId
       FROM app_user_projects up
       JOIN app_projects p ON p.id = up.project_id
      WHERE p.company_id = ?`,
    [req.user!.companyId],
  );
  const projectIds = new Map<number, number[]>();
  for (const row of assignments) projectIds.set(Number(row.userId), [...(projectIds.get(Number(row.userId)) ?? []), Number(row.projectId)]);
  return res.json({ users: users.map((user) => ({ ...user, projectIds: projectIds.get(Number(user.id)) ?? [] })) });
});

usersRouter.get('/options', requirePermission('admin.users.view'), async (req: AuthRequest, res) => {
  const [roles] = await db.query<RowDataPacket[]>('SELECT id, role_key AS `key`, name FROM app_roles ORDER BY name');
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT id, name, code, status FROM app_projects WHERE company_id = ? ORDER BY name`,
    [req.user!.companyId],
  );
  return res.json({ roles, projects });
});

async function validateReferences(companyId: number, roleId: number, projectIds: number[]) {
  const [[role]] = await db.query<RowDataPacket[]>('SELECT id, role_key AS roleKey FROM app_roles WHERE id = ? LIMIT 1', [roleId]);
  if (!role) return { message: 'Selected user role does not exist.' };
  if (projectIds.length) {
    const [projects] = await db.query<RowDataPacket[]>(
      'SELECT id FROM app_projects WHERE company_id = ? AND id IN (?)',
      [companyId, projectIds],
    );
    if (projects.length !== new Set(projectIds).size) return { message: 'One or more selected projects are invalid.' };
  }
  return { roleKey: String(role.roleKey) };
}

usersRouter.post('/', requirePermission('admin.users.manage'), async (req: AuthRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter valid user details and a password of at least 8 characters.' });
  const data = parsed.data;
  const reference = await validateReferences(req.user!.companyId, data.roleId, data.projectIds);
  if (reference.message) return res.status(400).json({ message: reference.message });
  if (reference.roleKey === 'programmer' && req.user!.roleKey !== 'programmer') {
    return res.status(403).json({ message: 'Only a programmer can create another programmer account.' });
  }
  const [[duplicate]] = await db.query<RowDataPacket[]>(
    'SELECT id FROM app_users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
    [data.username, data.email],
  );
  if (duplicate) return res.status(409).json({ message: 'That username or email is already in use.' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_users (company_id, role_id, username, first_name, last_name, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.companyId, data.roleId, data.username, data.firstName, data.lastName || null, data.email, passwordHash, data.status],
    );
    for (const projectId of new Set(data.projectIds)) {
      await connection.query('INSERT INTO app_user_projects (user_id, project_id) VALUES (?, ?)', [result.insertId, projectId]);
    }
    await connection.commit();
    return res.status(201).json({ id: result.insertId, message: `User ${data.username} created.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
});

usersRouter.put('/:id', requirePermission('admin.users.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Enter valid user details.' });
  const data = parsed.data;
  const [[current]] = await db.query<RowDataPacket[]>(
    `SELECT u.id, r.role_key AS roleKey FROM app_users u JOIN app_roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.company_id = ? LIMIT 1`,
    [id, req.user!.companyId],
  );
  if (!current) return res.status(404).json({ message: 'User not found.' });
  const reference = await validateReferences(req.user!.companyId, data.roleId, data.projectIds);
  if (reference.message) return res.status(400).json({ message: reference.message });
  if ((current.roleKey === 'programmer' || reference.roleKey === 'programmer') && req.user!.roleKey !== 'programmer') {
    return res.status(403).json({ message: 'Only a programmer can change a programmer account.' });
  }
  if (id === req.user!.id && data.status !== 'active') return res.status(409).json({ message: 'You cannot disable your own account.' });
  const [[duplicate]] = await db.query<RowDataPacket[]>(
    'SELECT id FROM app_users WHERE id <> ? AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1',
    [id, data.username, data.email],
  );
  if (duplicate) return res.status(409).json({ message: 'That username or email is already in use.' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (data.password) {
      const passwordHash = await bcrypt.hash(data.password, 12);
      await connection.query(
        `UPDATE app_users SET role_id = ?, username = ?, first_name = ?, last_name = ?, email = ?, status = ?, password_hash = ?
          WHERE id = ? AND company_id = ?`,
        [data.roleId, data.username, data.firstName, data.lastName || null, data.email, data.status, passwordHash, id, req.user!.companyId],
      );
    } else {
      await connection.query(
        `UPDATE app_users SET role_id = ?, username = ?, first_name = ?, last_name = ?, email = ?, status = ?
          WHERE id = ? AND company_id = ?`,
        [data.roleId, data.username, data.firstName, data.lastName || null, data.email, data.status, id, req.user!.companyId],
      );
    }
    await connection.query('DELETE FROM app_user_projects WHERE user_id = ?', [id]);
    for (const projectId of new Set(data.projectIds)) {
      await connection.query('INSERT INTO app_user_projects (user_id, project_id) VALUES (?, ?)', [id, projectId]);
    }
    await connection.commit();
    return res.json({ message: `User ${data.username} updated.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
});

usersRouter.delete('/:id', requirePermission('admin.users.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid user.' });
  if (id === req.user!.id) return res.status(409).json({ message: 'You cannot delete your own account.' });
  const [[user]] = await db.query<RowDataPacket[]>(
    `SELECT u.username, r.role_key AS roleKey FROM app_users u JOIN app_roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.company_id = ? LIMIT 1`,
    [id, req.user!.companyId],
  );
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.roleKey === 'programmer') return res.status(409).json({ message: 'Programmer accounts cannot be deleted.' });
  await db.query('DELETE FROM app_users WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  return res.json({ message: `User ${user.username} deleted.` });
});
