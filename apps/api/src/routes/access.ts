import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

export const accessRouter = Router();
accessRouter.use(authenticate, requirePermission('admin.access.manage'));

accessRouter.get('/roles', async (_req, res) => {
  const [roles] = await db.query<RowDataPacket[]>(
    `SELECT r.id, r.role_key AS 'key', r.name, r.description, COUNT(u.id) AS users
       FROM app_roles r LEFT JOIN app_users u ON u.role_id = r.id
      GROUP BY r.id ORDER BY r.id`,
  );
  const [permissions] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.permission_key AS permissionKey, p.name, p.module,
            r.id AS roleId, IF(r.role_key = 'programmer', 1, COALESCE(rp.allowed, 0)) AS allowed
       FROM app_permissions p
       CROSS JOIN app_roles r
       LEFT JOIN app_role_permissions rp ON rp.permission_id = p.id AND rp.role_id = r.id
      ORDER BY p.module, p.name, r.id`,
  );
  return res.json({ roles, permissions });
});

const updateSchema = z.object({ allowed: z.boolean() });
accessRouter.put('/roles/:roleId/permissions/:permissionId', async (req, res) => {
  const roleId = Number(req.params.roleId);
  const permissionId = Number(req.params.permissionId);
  const parsed = updateSchema.safeParse(req.body);
  if (!Number.isInteger(roleId) || !Number.isInteger(permissionId) || !parsed.success) {
    return res.status(400).json({ message: 'Invalid permission update.' });
  }
  const [[role]] = await db.query<RowDataPacket[]>('SELECT role_key AS roleKey, name FROM app_roles WHERE id = ? LIMIT 1', [roleId]);
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  if (role.roleKey === 'programmer') return res.status(409).json({ message: 'Programmer always has unrestricted access.' });
  await db.query<ResultSetHeader>(
    `INSERT INTO app_role_permissions (role_id, permission_id, allowed)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
    [roleId, permissionId, parsed.data.allowed ? 1 : 0],
  );
  return res.status(204).send();
});

const bulkUpdateSchema = z.object({
  permissions: z.array(z.object({ permissionId: z.number().int().positive(), allowed: z.boolean() })).min(1),
});
accessRouter.put('/roles/:roleId/permissions', async (req, res) => {
  const roleId = Number(req.params.roleId);
  const parsed = bulkUpdateSchema.safeParse(req.body);
  if (!Number.isInteger(roleId) || !parsed.success) return res.status(400).json({ message: 'Invalid permission update.' });
  const [[role]] = await db.query<RowDataPacket[]>('SELECT role_key AS roleKey, name FROM app_roles WHERE id = ? LIMIT 1', [roleId]);
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  if (role.roleKey === 'programmer') return res.status(409).json({ message: 'Programmer always has unrestricted access.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of parsed.data.permissions) {
      await connection.query(
        `INSERT INTO app_role_permissions (role_id, permission_id, allowed) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        [roleId, item.permissionId, item.allowed ? 1 : 0],
      );
    }
    await connection.commit();
    return res.json({ message: `Permissions updated for ${role.name}.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
});
