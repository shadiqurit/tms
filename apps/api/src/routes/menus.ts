import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

const menuSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  permissionId: z.number().int().positive().nullable().optional(),
  label: z.string().trim().min(1).max(100),
  route: z.string().trim().max(160).nullable().optional(),
  icon: z.string().trim().min(1).max(60).default('Circle'),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});
const grantSchema = z.object({
  permissions: z.array(z.object({ permissionId: z.number().int().positive(), allowed: z.boolean() })).default([]),
});
const overrideSchema = z.object({
  permissions: z.array(z.object({ permissionId: z.number().int().positive(), allowed: z.boolean().nullable() })).default([]),
});

export const menusRouter = Router();
menusRouter.use(authenticate);

menusRouter.get('/', requirePermission('admin.menus.view'), async (req: AuthRequest, res) => {
  const [items] = await db.query<RowDataPacket[]>(
    `SELECT n.id, n.parent_id AS parentId, n.permission_id AS permissionId, n.label, n.route, n.icon,
            n.sort_order AS sortOrder, n.active, p.permission_key AS permissionKey
       FROM app_navigation_items n
       LEFT JOIN app_permissions p ON p.id = n.permission_id
      ORDER BY COALESCE(n.parent_id, n.id), n.parent_id IS NOT NULL, n.sort_order, n.id`,
  );
  const [permissions] = await db.query<RowDataPacket[]>(
    'SELECT id, permission_key AS permissionKey, name, module FROM app_permissions ORDER BY module, name',
  );
  const [roles] = await db.query<RowDataPacket[]>(
    `SELECT r.id, r.role_key AS \`key\`, r.name, COUNT(u.id) AS users
       FROM app_roles r LEFT JOIN app_users u ON u.role_id = r.id
      GROUP BY r.id ORDER BY r.name`,
  );
  const [users] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.username, CONCAT_WS(' ', u.first_name, u.last_name) AS name,
            u.role_id AS roleId, r.role_key AS roleKey, r.name AS roleName, u.status
       FROM app_users u JOIN app_roles r ON r.id = u.role_id
      WHERE u.company_id = ? ORDER BY u.first_name, u.last_name, u.username`,
    [req.user!.companyId],
  );
  const [roleGrants] = await db.query<RowDataPacket[]>(
    `SELECT rp.role_id AS roleId, rp.permission_id AS permissionId, rp.allowed
       FROM app_role_permissions rp
       JOIN (SELECT DISTINCT permission_id FROM app_navigation_items WHERE permission_id IS NOT NULL) mp
         ON mp.permission_id = rp.permission_id`,
  );
  const [userOverrides] = await db.query<RowDataPacket[]>(
    `SELECT up.user_id AS userId, up.permission_id AS permissionId, up.allowed
       FROM app_user_permissions up
       JOIN app_users u ON u.id = up.user_id
       JOIN (SELECT DISTINCT permission_id FROM app_navigation_items WHERE permission_id IS NOT NULL) mp
         ON mp.permission_id = up.permission_id
      WHERE u.company_id = ?`,
    [req.user!.companyId],
  );
  return res.json({ items, permissions, roles, users, roleGrants, userOverrides });
});

async function validMenuReferences(parentId: number | null | undefined, permissionId: number | null | undefined, currentId?: number) {
  if (parentId) {
    if (currentId && parentId === currentId) return 'A menu cannot be its own parent.';
    const [[parent]] = await db.query<RowDataPacket[]>('SELECT id, parent_id AS parentId FROM app_navigation_items WHERE id = ? LIMIT 1', [parentId]);
    if (!parent) return 'Selected parent menu does not exist.';
    if (parent.parentId) return 'Only one menu sub-level is supported.';
  }
  if (permissionId) {
    const [[permission]] = await db.query<RowDataPacket[]>('SELECT id FROM app_permissions WHERE id = ? LIMIT 1', [permissionId]);
    if (!permission) return 'Selected permission does not exist.';
  }
  return null;
}

menusRouter.post('/', requirePermission('admin.menus.manage'), async (req, res) => {
  const parsed = menuSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter valid menu details.' });
  const data = parsed.data;
  const invalid = await validMenuReferences(data.parentId, data.permissionId);
  if (invalid) return res.status(400).json({ message: invalid });
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_navigation_items (parent_id, permission_id, label, route, icon, sort_order, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.parentId ?? null, data.permissionId ?? null, data.label, data.route || null, data.icon, data.sortOrder, data.active ? 1 : 0],
  );
  return res.status(201).json({ id: result.insertId, message: `Menu ${data.label} created.` });
});

menusRouter.put('/:id', requirePermission('admin.menus.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = menuSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Enter valid menu details.' });
  const [[current]] = await db.query<RowDataPacket[]>('SELECT id FROM app_navigation_items WHERE id = ? LIMIT 1', [id]);
  if (!current) return res.status(404).json({ message: 'Menu item not found.' });
  const data = parsed.data;
  const invalid = await validMenuReferences(data.parentId, data.permissionId, id);
  if (invalid) return res.status(400).json({ message: invalid });
  if (data.parentId) {
    const [[child]] = await db.query<RowDataPacket[]>('SELECT id FROM app_navigation_items WHERE parent_id = ? LIMIT 1', [id]);
    if (child) return res.status(409).json({ message: 'A menu with children cannot be moved under another menu.' });
  }
  await db.query(
    `UPDATE app_navigation_items
        SET parent_id = ?, permission_id = ?, label = ?, route = ?, icon = ?, sort_order = ?, active = ?
      WHERE id = ?`,
    [data.parentId ?? null, data.permissionId ?? null, data.label, data.route || null, data.icon, data.sortOrder, data.active ? 1 : 0, id],
  );
  return res.json({ message: `Menu ${data.label} updated.` });
});

menusRouter.delete('/:id', requirePermission('admin.menus.manage'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid menu item.' });
  const [[item]] = await db.query<RowDataPacket[]>('SELECT label FROM app_navigation_items WHERE id = ? LIMIT 1', [id]);
  if (!item) return res.status(404).json({ message: 'Menu item not found.' });
  const [[child]] = await db.query<RowDataPacket[]>('SELECT id FROM app_navigation_items WHERE parent_id = ? LIMIT 1', [id]);
  if (child) return res.status(409).json({ message: 'Remove or move the child menus before deleting this group.' });
  await db.query('DELETE FROM app_navigation_items WHERE id = ?', [id]);
  return res.json({ message: `Menu ${item.label} deleted.` });
});

async function validateMenuPermissionIds(permissionIds: number[]) {
  const unique = [...new Set(permissionIds)];
  if (!unique.length) return true;
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT DISTINCT permission_id AS id FROM app_navigation_items WHERE permission_id IN (?)',
    [unique],
  );
  return rows.length === unique.length;
}

menusRouter.put('/roles/:roleId/permissions', requirePermission('admin.menus.manage'), async (req, res) => {
  const roleId = Number(req.params.roleId);
  const parsed = grantSchema.safeParse(req.body);
  if (!Number.isInteger(roleId) || !parsed.success) return res.status(400).json({ message: 'Invalid group menu permissions.' });
  const [[role]] = await db.query<RowDataPacket[]>('SELECT role_key AS roleKey, name FROM app_roles WHERE id = ? LIMIT 1', [roleId]);
  if (!role) return res.status(404).json({ message: 'User group not found.' });
  if (role.roleKey === 'programmer') return res.status(409).json({ message: 'Programmer always has every menu.' });
  if (!(await validateMenuPermissionIds(parsed.data.permissions.map((item) => item.permissionId)))) {
    return res.status(400).json({ message: 'One or more menu permissions are invalid.' });
  }
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
    return res.json({ message: `Menu access updated for ${role.name}.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
});

menusRouter.put('/users/:userId/permissions', requirePermission('admin.menus.manage'), async (req: AuthRequest, res) => {
  const userId = Number(req.params.userId);
  const parsed = overrideSchema.safeParse(req.body);
  if (!Number.isInteger(userId) || !parsed.success) return res.status(400).json({ message: 'Invalid user menu permissions.' });
  const [[user]] = await db.query<RowDataPacket[]>(
    `SELECT u.username, r.role_key AS roleKey FROM app_users u JOIN app_roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.company_id = ? LIMIT 1`,
    [userId, req.user!.companyId],
  );
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.roleKey === 'programmer') return res.status(409).json({ message: 'Programmer always has every menu.' });
  if (!(await validateMenuPermissionIds(parsed.data.permissions.map((item) => item.permissionId)))) {
    return res.status(400).json({ message: 'One or more menu permissions are invalid.' });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of parsed.data.permissions) {
      if (item.allowed === null) {
        await connection.query('DELETE FROM app_user_permissions WHERE user_id = ? AND permission_id = ?', [userId, item.permissionId]);
      } else {
        await connection.query(
          `INSERT INTO app_user_permissions (user_id, permission_id, allowed) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
          [userId, item.permissionId, item.allowed ? 1 : 0],
        );
      }
    }
    await connection.commit();
    return res.json({ message: `Personal menu access updated for ${user.username}.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
});
