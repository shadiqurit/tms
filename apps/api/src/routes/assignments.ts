import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticate);

const assignmentSchema = z.object({
  projectIds: z.array(z.number().int().positive()).max(100),
  siteIds: z.array(z.number().int().positive()).max(1000),
});

async function loadAssignments(companyId: number, employeeId?: number) {
  const params = employeeId ? [companyId, employeeId] : [companyId];
  const employeeCondition = employeeId ? ' AND e.id = ?' : '';
  const relationCondition = employeeId ? ' AND ep.employee_id = ?' : '';
  const siteCondition = employeeId ? ' AND es.employee_id = ?' : '';
  const [employees] = await db.query<RowDataPacket[]>(
    `SELECT e.id, e.employee_code AS employeeCode, CONCAT(TRIM(e.first_name), ' ', TRIM(COALESCE(e.last_name, ''))) AS name,
            e.phone, e.email, e.address, e.status
       FROM app_employees e WHERE e.company_id = ?${employeeCondition} ORDER BY e.first_name, e.last_name`, params,
  );
  const [projectRows] = await db.query<RowDataPacket[]>(
    `SELECT ep.employee_id AS employeeId, p.id, p.name, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code
       FROM app_employee_projects ep JOIN app_projects p ON p.id = ep.project_id
      WHERE p.company_id = ?${relationCondition} ORDER BY p.id`, params,
  );
  const [siteRows] = await db.query<RowDataPacket[]>(
    `SELECT es.employee_id AS employeeId, s.id, s.project_id AS projectId, s.name, s.address,
            p.name AS projectName, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode
       FROM app_employee_sites es
       JOIN app_project_sites s ON s.id = es.site_id
       JOIN app_projects p ON p.id = s.project_id
      WHERE p.company_id = ?${siteCondition} ORDER BY p.id, s.name`, params,
  );
  return employees.map((employee) => ({
    ...employee,
    projects: projectRows.filter((row) => Number(row.employeeId) === Number(employee.id)),
    sites: siteRows.filter((row) => Number(row.employeeId) === Number(employee.id)),
  }));
}

assignmentsRouter.get('/', requirePermission('assignments.view'), async (req: AuthRequest, res) => {
  return res.json({ assignments: await loadAssignments(req.user!.companyId) });
});

assignmentsRouter.get('/options', requirePermission('assignments.view'), async (req: AuthRequest, res) => {
  const [employees] = await db.query<RowDataPacket[]>(
    `SELECT id, employee_code AS employeeCode,
            CONCAT(TRIM(first_name), ' ', TRIM(COALESCE(last_name, ''))) AS name, phone
       FROM app_employees WHERE company_id = ? AND status = 'active' ORDER BY first_name, last_name`,
    [req.user!.companyId],
  );
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT id, name, COALESCE(package_no, code, CONCAT('#', id)) AS code, tender_id AS tenderId, address AS location
       FROM app_projects WHERE company_id = ? AND status IN ('active', 'planned') ORDER BY id`,
    [req.user!.companyId],
  );
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address,
            p.name AS projectName, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
      WHERE p.company_id = ? AND s.status = 'active' ORDER BY p.id, s.name`,
    [req.user!.companyId],
  );
  return res.json({ employees, projects, sites });
});

assignmentsRouter.get('/:employeeId', requirePermission('assignments.view'), async (req: AuthRequest, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId)) return res.status(400).json({ message: 'Invalid employee.' });
  const assignments = await loadAssignments(req.user!.companyId, employeeId);
  if (!assignments[0]) return res.status(404).json({ message: 'Employee not found.' });
  return res.json({ assignment: assignments[0] });
});

assignmentsRouter.put('/:employeeId', requirePermission('assignments.manage'), async (req: AuthRequest, res) => {
  const employeeId = Number(req.params.employeeId);
  const parsed = assignmentSchema.safeParse(req.body);
  if (!Number.isInteger(employeeId) || !parsed.success) return res.status(400).json({ message: 'Invalid assignment selection.' });
  const projectIds = [...new Set(parsed.data.projectIds)];
  const siteIds = [...new Set(parsed.data.siteIds)];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [employees] = await connection.query<RowDataPacket[]>('SELECT id FROM app_employees WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [employeeId, req.user!.companyId]);
    if (!employees[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }
    if (projectIds.length) {
      const placeholders = projectIds.map(() => '?').join(',');
      const [validProjects] = await connection.query<RowDataPacket[]>(`SELECT id FROM app_projects WHERE company_id = ? AND id IN (${placeholders})`, [req.user!.companyId, ...projectIds]);
      if (validProjects.length !== projectIds.length) {
        await connection.rollback();
        return res.status(400).json({ message: 'One or more selected projects are invalid.' });
      }
    }
    if (siteIds.length) {
      const placeholders = siteIds.map(() => '?').join(',');
      const [validSites] = await connection.query<RowDataPacket[]>(
        `SELECT s.id, s.project_id AS projectId FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
          WHERE p.company_id = ? AND s.id IN (${placeholders})`, [req.user!.companyId, ...siteIds],
      );
      if (validSites.length !== siteIds.length || validSites.some((site) => !projectIds.includes(Number(site.projectId)))) {
        await connection.rollback();
        return res.status(400).json({ message: 'Every selected site must belong to a selected project.' });
      }
    }
    const [beforeProjects] = await connection.query<RowDataPacket[]>('SELECT project_id FROM app_employee_projects WHERE employee_id = ?', [employeeId]);
    const [beforeSites] = await connection.query<RowDataPacket[]>('SELECT site_id FROM app_employee_sites WHERE employee_id = ?', [employeeId]);
    await connection.query('DELETE FROM app_employee_sites WHERE employee_id = ?', [employeeId]);
    await connection.query('DELETE FROM app_employee_projects WHERE employee_id = ?', [employeeId]);
    for (const projectId of projectIds) await connection.query('INSERT INTO app_employee_projects (employee_id, project_id) VALUES (?, ?)', [employeeId, projectId]);
    for (const siteId of siteIds) await connection.query('INSERT INTO app_employee_sites (employee_id, site_id) VALUES (?, ?)', [employeeId, siteId]);
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, ?, 'update', 'employee_assignment', ?, ?, ?)`,
      [req.user!.companyId, req.user!.id, String(employeeId), JSON.stringify({ projectIds: beforeProjects, siteIds: beforeSites }), JSON.stringify({ projectIds, siteIds })],
    );
    await connection.commit();
    return res.json({ employeeId, message: 'Assignments saved.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

assignmentsRouter.delete('/:employeeId', requirePermission('assignments.manage'), async (req: AuthRequest, res) => {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId)) return res.status(400).json({ message: 'Invalid employee.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [employees] = await connection.query<RowDataPacket[]>('SELECT id FROM app_employees WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [employeeId, req.user!.companyId]);
    if (!employees[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }
    await connection.query('DELETE FROM app_employee_sites WHERE employee_id = ?', [employeeId]);
    await connection.query('DELETE FROM app_employee_projects WHERE employee_id = ?', [employeeId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
