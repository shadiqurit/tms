import { Router } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const expensesRouter = Router();
expensesRouter.use(authenticate);

const optionalText = (length: number) => z.string().trim().max(length).optional().nullable();
const optionalDate = z.string().date().or(z.literal('')).optional().nullable();
const expenseTypeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phase: z.enum(['pre_award', 'execution']),
  refundable: z.boolean(),
  defaultRate: z.number().nonnegative().optional().nullable(),
  defaultAmount: z.number().nonnegative().optional().nullable(),
  defaultReturnAmount: z.number().nonnegative().optional().nullable(),
  active: z.boolean(),
});
const expenseLineSchema = z.object({
  expenseTypeId: z.number().int().positive(),
  quantity: z.number().nonnegative().optional().nullable(),
  unitName: optionalText(40),
  amount: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().nullable(),
  returnedAmount: z.number().nonnegative().optional().nullable(),
  returnDate: optionalDate,
  notes: optionalText(500),
});
const expensePaymentSchema = z.object({
  projectId: z.number().int().positive(),
  paymentNo: optionalText(100),
  payTo: optionalText(160),
  payeeAddress: optionalText(300),
  paymentDate: z.string().date(),
  paymentType: optionalText(40),
  referenceNo: optionalText(120),
  referenceDate: optionalDate,
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['draft', 'posted', 'cancelled']),
  lines: z.array(expenseLineSchema).min(1).max(250),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;

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

async function accessibleExpensePayment(user: NonNullable<AuthRequest['user']>, paymentId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ep.id FROM app_expense_payments ep
       JOIN app_projects p ON p.id = ep.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE ep.id = ? AND ep.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, paymentId, user.companyId, user.roleKey],
  );
  return Boolean(rows[0]);
}

async function validExpenseTypes(connection: PoolConnection, companyId: number, typeIds: number[]) {
  const uniqueIds = [...new Set(typeIds)];
  const placeholders = uniqueIds.map(() => '?').join(',');
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM app_expense_types WHERE company_id = ? AND active = 1 AND id IN (${placeholders})`,
    [companyId, ...uniqueIds],
  );
  return rows.length === uniqueIds.length;
}

expensesRouter.get('/types', requirePermission('expense_setup.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT et.id, et.name, et.phase, et.refundable = 1 AS refundable,
            et.default_rate AS defaultRate, et.default_amount AS defaultAmount,
            et.default_return_amount AS defaultReturnAmount, et.active = 1 AS active,
            COUNT(epl.id) AS usageCount
       FROM app_expense_types et
       LEFT JOIN app_expense_payment_lines epl ON epl.expense_type_id = et.id
      WHERE et.company_id = ?
      GROUP BY et.id ORDER BY et.phase, et.name`,
    [req.user!.companyId],
  );
  return res.json({ expenseTypes: rows });
});

expensesRouter.post('/types', requirePermission('expense_setup.manage'), async (req: AuthRequest, res) => {
  const parsed = expenseTypeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid expense type.' });
  const item = parsed.data;
  const [duplicate] = await db.query<RowDataPacket[]>('SELECT id FROM app_expense_types WHERE company_id = ? AND LOWER(name) = LOWER(?) LIMIT 1', [req.user!.companyId, item.name]);
  if (duplicate[0]) return res.status(409).json({ message: 'An expense type with this name already exists.' });
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_expense_types
       (company_id, name, phase, refundable, default_rate, default_amount, default_return_amount, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, item.name, item.phase, item.refundable ? 1 : 0, item.defaultRate ?? null,
      item.defaultAmount ?? null, item.defaultReturnAmount ?? null, item.active ? 1 : 0],
  );
  return res.status(201).json({ id: result.insertId, message: 'Expense type created.' });
});

expensesRouter.put('/types/:id', requirePermission('expense_setup.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = expenseTypeSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Enter a valid expense type.' });
  const [existing] = await db.query<RowDataPacket[]>('SELECT * FROM app_expense_types WHERE id = ? AND company_id = ? LIMIT 1', [id, req.user!.companyId]);
  if (!existing[0]) return res.status(404).json({ message: 'Expense type not found.' });
  const item = parsed.data;
  const [duplicate] = await db.query<RowDataPacket[]>('SELECT id FROM app_expense_types WHERE company_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1', [req.user!.companyId, item.name, id]);
  if (duplicate[0]) return res.status(409).json({ message: 'An expense type with this name already exists.' });
  await db.query(
    `UPDATE app_expense_types SET name = ?, phase = ?, refundable = ?, default_rate = ?,
       default_amount = ?, default_return_amount = ?, active = ? WHERE id = ? AND company_id = ?`,
    [item.name, item.phase, item.refundable ? 1 : 0, item.defaultRate ?? null, item.defaultAmount ?? null,
      item.defaultReturnAmount ?? null, item.active ? 1 : 0, id, req.user!.companyId],
  );
  return res.json({ id, message: 'Expense type updated.' });
});

expensesRouter.get('/types/:id/delete-check', requirePermission('expense_setup.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense type.' });
  const [[item]] = await db.query<RowDataPacket[]>('SELECT id, name FROM app_expense_types WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  if (!item) return res.status(404).json({ message: 'Expense type not found.' });
  const [[usage]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS entries FROM app_expense_payment_lines WHERE expense_type_id = ?', [id]);
  const entries = Number(usage?.entries ?? 0);
  return res.json({ canDelete: entries === 0, references: { expenseEntries: entries } });
});

expensesRouter.delete('/types/:id', requirePermission('expense_setup.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense type.' });
  try {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM app_expense_types WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Expense type not found.' });
    return res.status(204).send();
  } catch (error) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This expense type is already used by expense entries and cannot be deleted.' });
    }
    throw error;
  }
});

expensesRouter.get('/options', requirePermission('expenses.view'), async (req: AuthRequest, res) => {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT p.id, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code, p.name,
            p.tender_id AS tenderId, p.address AS location
       FROM app_projects p
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY p.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [expenseTypes] = await db.query<RowDataPacket[]>(
    `SELECT id, name, phase, refundable = 1 AS refundable, default_amount AS defaultAmount,
            default_return_amount AS defaultReturnAmount
       FROM app_expense_types WHERE company_id = ? AND active = 1 ORDER BY phase, name`,
    [req.user!.companyId],
  );
  return res.json({ projects, expenseTypes });
});

expensesRouter.get('/', requirePermission('expenses.view'), async (req: AuthRequest, res) => {
  const phase = req.query.phase === 'pre_award' ? 'pre_award' : req.query.phase === 'execution' ? 'execution' : null;
  if (!phase) return res.status(400).json({ message: 'Choose pre-award or project expenses.' });
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ep.id, ep.payment_no AS paymentNo, ep.payment_date AS paymentDate, ep.pay_to AS payTo,
            ep.reference_no AS referenceNo, ep.notes, ep.status, p.id AS projectId,
            COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode, p.name AS projectName,
            COUNT(epl.id) AS lineCount, COALESCE(SUM(epl.amount), 0) AS grossAmount,
            COALESCE(SUM(epl.returned_amount), 0) AS returnedAmount,
            COALESCE(SUM(epl.total_amount), 0) AS totalAmount
       FROM app_expense_payments ep
       JOIN app_projects p ON p.id = ep.project_id
       JOIN app_expense_payment_lines epl ON epl.payment_id = ep.id
       JOIN app_expense_types et ON et.id = epl.expense_type_id AND et.phase = ?
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE ep.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      GROUP BY ep.id, p.id
      ORDER BY ep.payment_date DESC, ep.id DESC`,
    [phase, req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ expenses: rows, phase });
});

expensesRouter.get('/:id', requirePermission('expenses.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense voucher.' });
  const [headers] = await db.query<RowDataPacket[]>(
    `SELECT ep.id, ep.project_id AS projectId, ep.payment_no AS paymentNo, ep.pay_to AS payTo,
            ep.payee_address AS payeeAddress, ep.payment_date AS paymentDate,
            ep.payment_type AS paymentType, ep.reference_no AS referenceNo,
            ep.reference_date AS referenceDate, ep.notes, ep.status
       FROM app_expense_payments ep
       JOIN app_projects p ON p.id = ep.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE ep.id = ? AND ep.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
  );
  if (!headers[0]) return res.status(404).json({ message: 'Expense voucher not found.' });
  const [lines] = await db.query<RowDataPacket[]>(
    `SELECT epl.id, epl.expense_type_id AS expenseTypeId, et.name AS expenseTypeName, et.phase,
            et.refundable = 1 AS refundable, epl.quantity, epl.unit_name AS unitName,
            epl.amount, epl.discount, epl.returned_amount AS returnedAmount,
            epl.total_amount AS totalAmount, epl.return_date AS returnDate, epl.notes
       FROM app_expense_payment_lines epl
       LEFT JOIN app_expense_types et ON et.id = epl.expense_type_id
      WHERE epl.payment_id = ? ORDER BY et.phase, epl.id`,
    [id],
  );
  return res.json({ expense: { ...headers[0], lines } });
});

async function saveLines(connection: PoolConnection, paymentId: number, lines: z.infer<typeof expenseLineSchema>[]) {
  for (const line of lines) {
    const totalAmount = Math.max(0, line.amount - (line.discount ?? 0) - (line.returnedAmount ?? 0));
    await connection.query(
      `INSERT INTO app_expense_payment_lines
         (payment_id, expense_type_id, quantity, unit_name, amount, discount, returned_amount,
          total_amount, return_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, line.expenseTypeId, line.quantity ?? null, emptyToNull(line.unitName), line.amount,
        line.discount ?? null, line.returnedAmount ?? null, totalAmount, emptyToNull(line.returnDate),
        emptyToNull(line.notes)],
    );
  }
}

expensesRouter.post('/', requirePermission('expenses.manage'), async (req: AuthRequest, res) => {
  const parsed = expensePaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the expense header and add at least one valid expense line.' });
  if (!(await accessibleProject(req.user!, parsed.data.projectId))) return res.status(403).json({ message: 'You do not have access to this project.' });
  const item = parsed.data;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (!(await validExpenseTypes(connection, req.user!.companyId, item.lines.map((line) => line.expenseTypeId)))) {
      await connection.rollback();
      return res.status(400).json({ message: 'One or more expense types are invalid or inactive.' });
    }
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_expense_payments
         (company_id, project_id, payment_no, pay_to, payee_address, payment_date, payment_type,
          reference_no, reference_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user!.companyId, item.projectId, emptyToNull(item.paymentNo), emptyToNull(item.payTo),
        emptyToNull(item.payeeAddress), item.paymentDate, emptyToNull(item.paymentType),
        emptyToNull(item.referenceNo), emptyToNull(item.referenceDate), emptyToNull(item.notes), item.status],
    );
    await saveLines(connection, result.insertId, item.lines);
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
       VALUES (?, ?, 'create', 'expense_payment', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(item)],
    );
    await connection.commit();
    return res.status(201).json({ id: result.insertId, message: 'Expense voucher created.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

expensesRouter.put('/:id', requirePermission('expenses.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = expensePaymentSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Check the expense header and line information.' });
  if (!(await accessibleExpensePayment(req.user!, id))) return res.status(404).json({ message: 'Expense voucher not found.' });
  if (!(await accessibleProject(req.user!, parsed.data.projectId))) return res.status(403).json({ message: 'You do not have access to this project.' });
  const item = parsed.data;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [before] = await connection.query<RowDataPacket[]>('SELECT * FROM app_expense_payments WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [id, req.user!.companyId]);
    if (!before[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Expense voucher not found.' });
    }
    if (!(await validExpenseTypes(connection, req.user!.companyId, item.lines.map((line) => line.expenseTypeId)))) {
      await connection.rollback();
      return res.status(400).json({ message: 'One or more expense types are invalid or inactive.' });
    }
    await connection.query(
      `UPDATE app_expense_payments SET project_id = ?, payment_no = ?, pay_to = ?, payee_address = ?,
         payment_date = ?, payment_type = ?, reference_no = ?, reference_date = ?, notes = ?, status = ?
       WHERE id = ? AND company_id = ?`,
      [item.projectId, emptyToNull(item.paymentNo), emptyToNull(item.payTo), emptyToNull(item.payeeAddress),
        item.paymentDate, emptyToNull(item.paymentType), emptyToNull(item.referenceNo),
        emptyToNull(item.referenceDate), emptyToNull(item.notes), item.status, id, req.user!.companyId],
    );
    await connection.query('DELETE FROM app_expense_payment_lines WHERE payment_id = ?', [id]);
    await saveLines(connection, id, item.lines);
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, ?, 'update', 'expense_payment', ?, ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before[0]), JSON.stringify(item)],
    );
    await connection.commit();
    return res.json({ id, message: 'Expense voucher updated.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

expensesRouter.get('/:id/delete-check', requirePermission('expenses.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense voucher.' });
  if (!(await accessibleExpensePayment(req.user!, id))) return res.status(404).json({ message: 'Expense voucher not found.' });
  const [[lines]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS ownedLines FROM app_expense_payment_lines WHERE payment_id = ?', [id]);
  return res.json({ canDelete: true, references: { ownedLines: Number(lines?.ownedLines ?? 0), externalReferences: 0 } });
});

expensesRouter.delete('/:id', requirePermission('expenses.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense voucher.' });
  if (!(await accessibleExpensePayment(req.user!, id))) return res.status(404).json({ message: 'Expense voucher not found.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [before] = await connection.query<RowDataPacket[]>('SELECT * FROM app_expense_payments WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [id, req.user!.companyId]);
    if (!before[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Expense voucher not found.' });
    }
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'expense_payment', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before[0])],
    );
    await connection.query('DELETE FROM app_expense_payments WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This expense voucher is referenced by other records and cannot be deleted.' });
    }
    throw error;
  } finally {
    connection.release();
  }
});
