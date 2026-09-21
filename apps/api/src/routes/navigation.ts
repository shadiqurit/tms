import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

interface MenuRow extends RowDataPacket {
  id: number;
  parent_id: number | null;
  label: string;
  route: string | null;
  icon: string | null;
  permission_key: string | null;
}

export const navigationRouter = Router();
navigationRouter.use(authenticate);

navigationRouter.get('/', async (req: AuthRequest, res) => {
  const [rows] = await db.query<MenuRow[]>(
    `SELECT DISTINCT m.id, m.parent_id, m.label, m.route, m.icon, p.permission_key
       FROM app_menu_items m
       LEFT JOIN app_permissions p ON p.id = m.permission_id
       LEFT JOIN app_role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
      WHERE m.active = 1
        AND (m.permission_id IS NULL OR rp.allowed = 1 OR ? = 'programmer')
      ORDER BY m.sort_order, m.id`,
    [req.user!.roleId, req.user!.roleKey],
  );

  const byParent = new Map<number | null, MenuRow[]>();
  for (const row of rows) byParent.set(row.parent_id, [...(byParent.get(row.parent_id) ?? []), row]);
  const build = (parentId: number | null): unknown[] =>
    (byParent.get(parentId) ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      route: item.route,
      icon: item.icon,
      permission: item.permission_key,
      children: build(item.id),
    }));
  return res.json({ items: build(null) });
});
