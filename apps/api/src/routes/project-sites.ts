import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const projectSitesRouter = Router();
projectSitesRouter.use(authenticate);

const siteSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1).max(300),
  address: z.string().trim().max(300).optional().nullable(),
  status: z.enum(['active', 'completed', 'on_hold']),
});

async function accessibleProject(user: NonNullable<AuthRequest['user']>, projectId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id FROM app_projects p
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, projectId, user.companyId, user.roleKey],
  );
  return Boolean(rows[0]);
}

projectSitesRouter.get('/', requirePermission('project_sites.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address, s.status,
            p.name AS projectName, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode
       FROM app_project_sites s
       JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY p.id, s.name`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ sites: rows });
});

projectSitesRouter.get('/:id', requirePermission('project_sites.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project site.' });
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address, s.status,
            p.name AS projectName, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode
       FROM app_project_sites s
       JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE s.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
  );
  if (!rows[0]) return res.status(404).json({ message: 'Project site not found.' });
  return res.json({ site: rows[0] });
});

projectSitesRouter.post('/', requirePermission('project_sites.manage'), async (req: AuthRequest, res) => {
  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Select a project and enter the site name.' });
  if (!(await accessibleProject(req.user!, parsed.data.projectId))) return res.status(403).json({ message: 'You do not have access to this project.' });
  const site = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_project_sites (project_id, name, address, status) VALUES (?, ?, ?, ?)`,
    [site.projectId, site.name, site.address?.trim() || null, site.status],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'create', 'project_site', ?, ?)`,
    [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(site)],
  );
  return res.status(201).json({ id: result.insertId, message: 'Project site created.' });
});

projectSitesRouter.put('/:id', requirePermission('project_sites.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = siteSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Please check the site information.' });
  if (!(await accessibleProject(req.user!, parsed.data.projectId))) return res.status(403).json({ message: 'You do not have access to this project.' });
  const [beforeRows] = await db.query<RowDataPacket[]>(
    `SELECT s.* FROM app_project_sites s
       JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE s.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
  );
  if (!beforeRows[0]) return res.status(404).json({ message: 'Project site not found.' });
  const site = parsed.data;
  await db.query(
    `UPDATE app_project_sites SET project_id = ?, name = ?, address = ?, status = ? WHERE id = ?`,
    [site.projectId, site.name, site.address?.trim() || null, site.status, id],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'project_site', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(beforeRows[0]), JSON.stringify(site)],
  );
  return res.json({ id, message: 'Project site updated.' });
});

projectSitesRouter.delete('/:id', requirePermission('project_sites.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project site.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT s.* FROM app_project_sites s
         JOIN app_projects p ON p.id = s.project_id
         LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
        WHERE s.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
        LIMIT 1 FOR UPDATE`,
      [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
    );
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Project site not found.' });
    }
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'project_site', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(rows[0])],
    );
    await connection.query('DELETE FROM app_project_sites WHERE id = ?', [id]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This site has referenced transactions or assignments and cannot be deleted.' });
    }
    throw error;
  } finally {
    connection.release();
  }
});
