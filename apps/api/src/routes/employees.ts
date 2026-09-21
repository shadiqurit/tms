import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const employeesRouter = Router();
employeesRouter.use(authenticate);

const optionalDate = z.string().date().or(z.literal('')).optional().nullable();
const employeeSchema = z.object({
  employeeCode: z.string().trim().max(30).optional().nullable(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().nullable(),
  dateOfBirth: optionalDate,
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(120).or(z.literal('')).optional().nullable(),
  hireDate: optionalDate,
  salary: z.number().nonnegative().max(9999999999999).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  status: z.enum(['active', 'inactive']),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;

async function employeeReferences(connection: Pool | PoolConnection, employeeId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM app_employee_projects WHERE employee_id = ?) AS projects,
       (SELECT COUNT(*) FROM app_employee_sites WHERE employee_id = ?) AS sites`,
    [employeeId, employeeId],
  );
  return {
    projects: Number(rows[0]?.projects ?? 0),
    sites: Number(rows[0]?.sites ?? 0),
  };
}

async function duplicateEmployeeCode(companyId: number, employeeCode: string | null, excludeId?: number) {
  if (!employeeCode) return false;
  const values: Array<number | string> = [companyId, employeeCode];
  const exclude = excludeId ? ' AND id <> ?' : '';
  if (excludeId) values.push(excludeId);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM app_employees WHERE company_id = ? AND TRIM(employee_code) = ?${exclude} LIMIT 1`,
    values,
  );
  return Boolean(rows[0]);
}

employeesRouter.get('/', requirePermission('employees.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT e.id, e.employee_code AS employeeCode, e.first_name AS firstName, e.last_name AS lastName,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS name,
            e.date_of_birth AS dateOfBirth, e.phone, e.email, e.hire_date AS hireDate,
            e.salary, e.department, e.address, e.status,
            COUNT(DISTINCT ep.project_id) AS projectCount,
            COUNT(DISTINCT es.site_id) AS siteCount
       FROM app_employees e
       LEFT JOIN app_employee_projects ep ON ep.employee_id = e.id
       LEFT JOIN app_employee_sites es ON es.employee_id = e.id
      WHERE e.company_id = ?
      GROUP BY e.id
      ORDER BY e.status = 'active' DESC, e.first_name, e.last_name`,
    [req.user!.companyId],
  );
  return res.json({ employees: rows });
});

employeesRouter.get('/:id/delete-check', requirePermission('employees.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid employee.' });
  const [employees] = await db.query<RowDataPacket[]>(
    `SELECT id, CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), '')) AS name
       FROM app_employees WHERE id = ? AND company_id = ? LIMIT 1`,
    [id, req.user!.companyId],
  );
  if (!employees[0]) return res.status(404).json({ message: 'Employee not found.' });
  const references = await employeeReferences(db, id);
  const totalReferences = references.projects + references.sites;
  return res.json({ canDelete: totalReferences === 0, employee: employees[0], references });
});

employeesRouter.get('/:id', requirePermission('employees.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid employee.' });
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT e.id, e.employee_code AS employeeCode, e.first_name AS firstName, e.last_name AS lastName,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS name,
            e.date_of_birth AS dateOfBirth, e.phone, e.email, e.hire_date AS hireDate,
            e.salary, e.department, e.address, e.status,
            (SELECT COUNT(*) FROM app_employee_projects WHERE employee_id = e.id) AS projectCount,
            (SELECT COUNT(*) FROM app_employee_sites WHERE employee_id = e.id) AS siteCount
       FROM app_employees e WHERE e.id = ? AND e.company_id = ? LIMIT 1`,
    [id, req.user!.companyId],
  );
  if (!rows[0]) return res.status(404).json({ message: 'Employee not found.' });
  return res.json({ employee: rows[0] });
});

employeesRouter.post('/', requirePermission('employees.manage'), async (req: AuthRequest, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Please check the employee information and try again.' });
  const employee = parsed.data;
  const employeeCode = emptyToNull(employee.employeeCode);
  if (await duplicateEmployeeCode(req.user!.companyId, employeeCode)) {
    return res.status(409).json({ message: 'This employee code is already in use.' });
  }
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_employees
       (company_id, employee_code, first_name, last_name, date_of_birth, phone, email,
        hire_date, salary, department, address, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, employeeCode, employee.firstName, emptyToNull(employee.lastName),
      emptyToNull(employee.dateOfBirth), emptyToNull(employee.phone), emptyToNull(employee.email),
      emptyToNull(employee.hireDate), employee.salary ?? null, emptyToNull(employee.department),
      emptyToNull(employee.address), employee.status],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'create', 'employee', ?, ?)`,
    [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(employee)],
  );
  return res.status(201).json({ id: result.insertId, message: 'Employee created.' });
});

employeesRouter.put('/:id', requirePermission('employees.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = employeeSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Please check the employee information and try again.' });
  const [beforeRows] = await db.query<RowDataPacket[]>('SELECT * FROM app_employees WHERE id = ? AND company_id = ? LIMIT 1', [id, req.user!.companyId]);
  if (!beforeRows[0]) return res.status(404).json({ message: 'Employee not found.' });
  const employee = parsed.data;
  const employeeCode = emptyToNull(employee.employeeCode);
  if (await duplicateEmployeeCode(req.user!.companyId, employeeCode, id)) {
    return res.status(409).json({ message: 'This employee code is already in use.' });
  }
  await db.query<ResultSetHeader>(
    `UPDATE app_employees
        SET employee_code = ?, first_name = ?, last_name = ?, date_of_birth = ?, phone = ?,
            email = ?, hire_date = ?, salary = ?, department = ?, address = ?, status = ?
      WHERE id = ? AND company_id = ?`,
    [employeeCode, employee.firstName, emptyToNull(employee.lastName), emptyToNull(employee.dateOfBirth),
      emptyToNull(employee.phone), emptyToNull(employee.email), emptyToNull(employee.hireDate),
      employee.salary ?? null, emptyToNull(employee.department), emptyToNull(employee.address),
      employee.status, id, req.user!.companyId],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'employee', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(beforeRows[0]), JSON.stringify(employee)],
  );
  return res.json({ id, message: 'Employee updated.' });
});

employeesRouter.delete('/:id', requirePermission('employees.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid employee.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [employees] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM app_employees WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE',
      [id, req.user!.companyId],
    );
    const employee = employees[0];
    if (!employee) {
      await connection.rollback();
      return res.status(404).json({ message: 'Employee not found.' });
    }
    const references = await employeeReferences(connection, id);
    if (references.projects + references.sites > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: 'This employee cannot be deleted because project or site assignments exist.',
        references,
      });
    }
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'employee', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(employee)],
    );
    await connection.query('DELETE FROM app_employees WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This employee is referenced by other records and cannot be deleted.' });
    }
    throw error;
  } finally {
    connection.release();
  }
});
