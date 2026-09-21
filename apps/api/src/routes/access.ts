import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

export const accessRouter = Router();
accessRouter.use(authenticate, requirePermission('admin.access.manage'));

accessRouter.get('/roles', async (_req, res) => {
  const [roles] = await db.query<RowDataPacket[]>('SELECT id, role_key AS `key`, name, description FROM app_roles ORDER BY id');
  const [permissions] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.permission_key AS permissionKey, p.name, p.module,
            r.id AS roleId, COALESCE(rp.allowed, 0) AS allowed
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
  await db.query<ResultSetHeader>(
    `INSERT INTO app_role_permissions (role_id, permission_id, allowed)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
    [roleId, permissionId, parsed.data.allowed ? 1 : 0],
  );
  return res.status(204).send();
});
