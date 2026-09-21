import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const projectsRouter = Router();
projectsRouter.use(authenticate);

const projectSchema = z.object({
  name: z.string().trim().min(1).max(500),
  code: z.string().trim().max(30).optional().nullable(),
  tenderId: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  contractValue: z.number().nonnegative().optional().nullable(),
  startDate: z.string().date().or(z.literal('')).optional().nullable(),
  endDate: z.string().date().or(z.literal('')).optional().nullable(),
  status: z.enum(['planned', 'active', 'completed', 'on_hold', 'cancelled']),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;

async function projectReferences(connection: Pool | PoolConnection, projectId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM app_project_sites WHERE project_id = ?) AS sites,
       (SELECT COUNT(*) FROM app_user_projects WHERE project_id = ?) AS userAssignments`,
    [projectId, projectId],
  );
  return {
    sites: Number(rows[0]?.sites ?? 0),
    userAssignments: Number(rows[0]?.userAssignments ?? 0),
  };
}

projectsRouter.get('/', requirePermission('projects.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.code, p.tender_id AS tenderId, p.package_no AS packageNo,
            p.address, p.contract_value AS contractValue, p.status, p.start_date AS startDate,
            p.end_date AS endDate,
            COUNT(DISTINCT s.id) AS siteCount
       FROM app_projects p
       LEFT JOIN app_project_sites s ON s.project_id = p.id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      GROUP BY p.id ORDER BY p.start_date DESC, p.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ projects: rows });
});

projectsRouter.post('/', requirePermission('projects.manage'), async (req: AuthRequest, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Please check the project information and try again.' });
  const project = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_projects
       (company_id, name, code, tender_id, address, contract_value, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, project.name, emptyToNull(project.code), emptyToNull(project.tenderId),
      emptyToNull(project.address), project.contractValue ?? null, emptyToNull(project.startDate),
      emptyToNull(project.endDate), project.status],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'create', 'project', ?, ?)`,
    [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(project)],
  );
  return res.status(201).json({ id: result.insertId, message: 'Project created.' });
});

projectsRouter.put('/:id', requirePermission('projects.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = projectSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Please check the project information and try again.' });

  const [beforeRows] = await db.query<RowDataPacket[]>('SELECT * FROM app_projects WHERE id = ? AND company_id = ? LIMIT 1', [id, req.user!.companyId]);
  if (!beforeRows[0]) return res.status(404).json({ message: 'Project not found.' });
  const project = parsed.data;
  await db.query<ResultSetHeader>(
    `UPDATE app_projects SET name = ?, code = ?, tender_id = ?, address = ?, contract_value = ?,
       start_date = ?, end_date = ?, status = ? WHERE id = ? AND company_id = ?`,
    [project.name, emptyToNull(project.code), emptyToNull(project.tenderId), emptyToNull(project.address),
      project.contractValue ?? null, emptyToNull(project.startDate), emptyToNull(project.endDate), project.status,
      id, req.user!.companyId],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'project', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(beforeRows[0]), JSON.stringify(project)],
  );
  return res.json({ id, message: 'Project updated.' });
});

projectsRouter.get('/:id/delete-check', requirePermission('projects.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project.' });
  const [projects] = await db.query<RowDataPacket[]>('SELECT id, name FROM app_projects WHERE id = ? AND company_id = ? LIMIT 1', [id, req.user!.companyId]);
  if (!projects[0]) return res.status(404).json({ message: 'Project not found.' });
  const references = await projectReferences(db, id);
  const totalReferences = Object.values(references).reduce((sum, count) => sum + count, 0);
  return res.json({ canDelete: totalReferences === 0, project: projects[0], references });
});

projectsRouter.delete('/:id', requirePermission('projects.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid project.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [projects] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM app_projects WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE',
      [id, req.user!.companyId],
    );
    const project = projects[0];
    if (!project) {
      await connection.rollback();
      return res.status(404).json({ message: 'Project not found.' });
    }

    const references = await projectReferences(connection, id);
    const totalReferences = Object.values(references).reduce((sum, count) => sum + count, 0);
    if (totalReferences > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: 'This project cannot be deleted because referenced data exists.',
        references,
      });
    }

    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'project', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(project)],
    );
    await connection.query('DELETE FROM app_projects WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This project is still referenced by other records and cannot be deleted.' });
    }
    throw error;
  } finally {
    connection.release();
  }
});
