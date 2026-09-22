import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const sitePurchasesRouter = Router();
sitePurchasesRouter.use(authenticate);

const optionalText = (length: number) => z.string().trim().max(length).optional().nullable();
const optionalDate = z.string().date().or(z.literal('')).optional().nullable();
const purchaseSchema = z.object({
  projectId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  supplierId: z.number().int().positive().optional().nullable(),
  purchaseNo: optionalText(100),
  localSupplier: optionalText(200),
  supplierAddress: optionalText(500),
  purchaseDate: z.string().date(),
  purchaseType: z.enum(['local', 'corporate']),
  challanNo: optionalText(120),
  challanDate: optionalDate,
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['draft', 'posted', 'cancelled']),
});
const materialLineSchema = z.object({
  materialId: z.number().int().positive(),
  unitId: z.number().int().positive().optional().nullable(),
  siteId: z.number().int().positive().optional().nullable(),
  entryDate: z.string().date(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().nullable(),
  notes: optionalText(500),
});
const expenseLineSchema = z.object({
  expenseHeadId: z.number().int().positive().optional().nullable(),
  siteId: z.number().int().positive().optional().nullable(),
  entryDate: z.string().date(),
  amount: z.number().nonnegative(),
  notes: optionalText(500),
});
const expenseHeadSchema = z.object({
  name: z.string().trim().min(1).max(220),
  status: z.enum(['active', 'inactive']),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;

async function accessiblePurchase(user: NonNullable<AuthRequest['user']>, purchaseId: number, connection: Pool | PoolConnection = db) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT sp.id, sp.project_id AS projectId
       FROM app_site_purchases sp
       JOIN app_projects p ON p.id = sp.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE sp.id = ? AND sp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, purchaseId, user.companyId, user.roleKey],
  );
  return rows[0];
}

async function validatePurchaseHeader(user: NonNullable<AuthRequest['user']>, item: z.infer<typeof purchaseSchema>) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.id AS projectId, e.id AS employeeId, ep.employee_id AS assignmentId
       FROM app_projects p
       JOIN app_employees e ON e.id = ? AND e.company_id = p.company_id
       LEFT JOIN app_employee_projects ep ON ep.project_id = p.id AND ep.employee_id = e.id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [item.employeeId, user.id, item.projectId, user.companyId, user.roleKey],
  );
  if (!rows[0]) return 'The selected project or employee is invalid.';
  if (!rows[0].assignmentId) return 'Assign this employee to the selected project before entering purchases.';
  if (item.supplierId) {
    const [suppliers] = await db.query<RowDataPacket[]>('SELECT id FROM app_suppliers WHERE id = ? AND company_id = ? AND status = \'active\'', [item.supplierId, user.companyId]);
    if (!suppliers[0]) return 'The selected supplier is invalid.';
  }
  return null;
}

async function validateSite(connection: PoolConnection, siteId: number | null | undefined, projectId: number) {
  if (!siteId) return true;
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? LIMIT 1', [siteId, projectId]);
  return Boolean(rows[0]);
}

sitePurchasesRouter.get('/expense-heads', requirePermission('expense_setup.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT eh.id, eh.name, eh.status, COUNT(spe.id) AS usageCount
       FROM app_engineer_expense_heads eh
       LEFT JOIN app_site_purchase_expenses spe ON spe.expense_head_id = eh.id
      WHERE eh.company_id = ? GROUP BY eh.id ORDER BY eh.name`,
    [req.user!.companyId],
  );
  return res.json({ expenseHeads: rows });
});

sitePurchasesRouter.post('/expense-heads', requirePermission('expense_setup.manage'), async (req: AuthRequest, res) => {
  const parsed = expenseHeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid site-engineer expense head.' });
  const [duplicate] = await db.query<RowDataPacket[]>('SELECT id FROM app_engineer_expense_heads WHERE company_id = ? AND LOWER(name) = LOWER(?) LIMIT 1', [req.user!.companyId, parsed.data.name]);
  if (duplicate[0]) return res.status(409).json({ message: 'An expense head with this name already exists.' });
  const [result] = await db.query<ResultSetHeader>('INSERT INTO app_engineer_expense_heads (company_id, name, status) VALUES (?, ?, ?)', [req.user!.companyId, parsed.data.name, parsed.data.status]);
  return res.status(201).json({ id: result.insertId, message: 'Expense head created.' });
});

sitePurchasesRouter.put('/expense-heads/:id', requirePermission('expense_setup.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = expenseHeadSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Enter a valid site-engineer expense head.' });
  const [duplicate] = await db.query<RowDataPacket[]>('SELECT id FROM app_engineer_expense_heads WHERE company_id = ? AND LOWER(name) = LOWER(?) AND id <> ? LIMIT 1', [req.user!.companyId, parsed.data.name, id]);
  if (duplicate[0]) return res.status(409).json({ message: 'An expense head with this name already exists.' });
  const [result] = await db.query<ResultSetHeader>('UPDATE app_engineer_expense_heads SET name = ?, status = ? WHERE id = ? AND company_id = ?', [parsed.data.name, parsed.data.status, id, req.user!.companyId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Expense head not found.' });
  return res.json({ id, message: 'Expense head updated.' });
});

sitePurchasesRouter.get('/expense-heads/:id/delete-check', requirePermission('expense_setup.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense head.' });
  const [[item]] = await db.query<RowDataPacket[]>('SELECT id FROM app_engineer_expense_heads WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  if (!item) return res.status(404).json({ message: 'Expense head not found.' });
  const [[usage]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS entries FROM app_site_purchase_expenses WHERE expense_head_id = ?', [id]);
  const entries = Number(usage?.entries ?? 0);
  return res.json({ canDelete: entries === 0, references: { siteExpenseEntries: entries } });
});

sitePurchasesRouter.delete('/expense-heads/:id', requirePermission('expense_setup.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid expense head.' });
  try {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM app_engineer_expense_heads WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Expense head not found.' });
    return res.status(204).send();
  } catch (error) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This expense head is already used and cannot be deleted.' });
    }
    throw error;
  }
});

sitePurchasesRouter.get('/options', requirePermission('site_purchases.view'), async (req: AuthRequest, res) => {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT p.id, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code, p.name,
            p.tender_id AS tenderId, p.address AS location
       FROM app_projects p LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL) ORDER BY p.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [employees] = await db.query<RowDataPacket[]>(
    `SELECT id, employee_code AS employeeCode,
            CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), '')) AS name, phone
       FROM app_employees WHERE company_id = ? AND status = 'active' ORDER BY first_name, last_name`,
    [req.user!.companyId],
  );
  const [employeeProjects] = await db.query<RowDataPacket[]>(
    `SELECT ep.employee_id AS employeeId, ep.project_id AS projectId
       FROM app_employee_projects ep JOIN app_employees e ON e.id = ep.employee_id
      WHERE e.company_id = ?`, [req.user!.companyId],
  );
  const [suppliers] = await db.query<RowDataPacket[]>('SELECT id, code, name, address, phone FROM app_suppliers WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [materials] = await db.query<RowDataPacket[]>(
    `SELECT m.id, m.name, m.unit_id AS unitId, u.name AS unitName
       FROM app_materials m LEFT JOIN app_units u ON u.id = m.unit_id
      WHERE m.company_id = ? AND m.status = 'active' ORDER BY m.name`, [req.user!.companyId],
  );
  const [units] = await db.query<RowDataPacket[]>('SELECT id, name, code FROM app_units WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [expenseHeads] = await db.query<RowDataPacket[]>('SELECT id, name FROM app_engineer_expense_heads WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND s.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY s.name`, [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ projects, employees, employeeProjects, suppliers, materials, units, expenseHeads, sites });
});

sitePurchasesRouter.get('/', requirePermission('site_purchases.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT sp.id, sp.purchase_no AS purchaseNo, sp.purchase_date AS purchaseDate,
            sp.purchase_type AS purchaseType, sp.challan_no AS challanNo, sp.status,
            p.id AS projectId, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode,
            p.name AS projectName, e.id AS employeeId,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS employeeName,
            e.employee_code AS employeeCode, COALESCE(s.name, sp.local_supplier, 'Local supplier') AS supplierName,
            (SELECT COUNT(*) FROM app_site_purchase_materials m WHERE m.purchase_id = sp.id) AS materialCount,
            (SELECT COALESCE(SUM(m.total_amount), 0) FROM app_site_purchase_materials m WHERE m.purchase_id = sp.id) AS materialTotal,
            (SELECT COUNT(*) FROM app_site_purchase_expenses x WHERE x.purchase_id = sp.id) AS expenseCount,
            (SELECT COALESCE(SUM(x.amount), 0) FROM app_site_purchase_expenses x WHERE x.purchase_id = sp.id) AS expenseTotal
       FROM app_site_purchases sp
       JOIN app_projects p ON p.id = sp.project_id
       JOIN app_employees e ON e.id = sp.employee_id
       LEFT JOIN app_suppliers s ON s.id = sp.supplier_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE sp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY sp.purchase_date DESC, sp.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ purchases: rows });
});

sitePurchasesRouter.post('/', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the project, employee, date, and purchase information.' });
  const relationError = await validatePurchaseHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  const item = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_site_purchases
       (company_id, project_id, employee_id, supplier_id, purchase_no, local_supplier,
        supplier_address, purchase_date, purchase_type, challan_no, challan_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, item.projectId, item.employeeId, item.supplierId ?? null,
      emptyToNull(item.purchaseNo), emptyToNull(item.localSupplier), emptyToNull(item.supplierAddress),
      item.purchaseDate, item.purchaseType, emptyToNull(item.challanNo), emptyToNull(item.challanDate),
      emptyToNull(item.notes), item.status],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'create', 'site_purchase', ?, ?)`,
    [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(item)],
  );
  return res.status(201).json({ id: result.insertId, message: 'Site purchase created. You can now add materials and expenses.' });
});

sitePurchasesRouter.get('/:id', requirePermission('site_purchases.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid site purchase.' });
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT sp.id, sp.project_id AS projectId, sp.employee_id AS employeeId, sp.supplier_id AS supplierId,
            sp.purchase_no AS purchaseNo, sp.local_supplier AS localSupplier,
            sp.supplier_address AS supplierAddress, sp.purchase_date AS purchaseDate,
            sp.purchase_type AS purchaseType, sp.challan_no AS challanNo,
            sp.challan_date AS challanDate, sp.notes, sp.status,
            (SELECT COUNT(*) FROM app_site_purchase_materials m WHERE m.purchase_id = sp.id) AS materialCount,
            (SELECT COALESCE(SUM(m.total_amount), 0) FROM app_site_purchase_materials m WHERE m.purchase_id = sp.id) AS materialTotal,
            (SELECT COUNT(*) FROM app_site_purchase_expenses x WHERE x.purchase_id = sp.id) AS expenseCount,
            (SELECT COALESCE(SUM(x.amount), 0) FROM app_site_purchase_expenses x WHERE x.purchase_id = sp.id) AS expenseTotal
       FROM app_site_purchases sp
       JOIN app_projects p ON p.id = sp.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE sp.id = ? AND sp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
  );
  if (!rows[0]) return res.status(404).json({ message: 'Site purchase not found.' });
  return res.json({ purchase: rows[0] });
});

sitePurchasesRouter.put('/:id', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = purchaseSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Check the purchase information.' });
  const accessible = await accessiblePurchase(req.user!, id);
  if (!accessible) return res.status(404).json({ message: 'Site purchase not found.' });
  const [[before]] = await db.query<RowDataPacket[]>('SELECT * FROM app_site_purchases WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  const relationError = await validatePurchaseHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  const item = parsed.data;
  if (Number(accessible.projectId) !== item.projectId) {
    const [[counts]] = await db.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM app_site_purchase_materials WHERE purchase_id = ?) AS materials,
              (SELECT COUNT(*) FROM app_site_purchase_expenses WHERE purchase_id = ?) AS expenses`, [id, id],
    );
    if (Number(counts?.materials ?? 0) + Number(counts?.expenses ?? 0) > 0) {
      return res.status(409).json({ message: 'Remove purchase and expense entries before changing the project.' });
    }
  }
  await db.query(
    `UPDATE app_site_purchases SET project_id = ?, employee_id = ?, supplier_id = ?, purchase_no = ?,
       local_supplier = ?, supplier_address = ?, purchase_date = ?, purchase_type = ?, challan_no = ?,
       challan_date = ?, notes = ?, status = ? WHERE id = ? AND company_id = ?`,
    [item.projectId, item.employeeId, item.supplierId ?? null, emptyToNull(item.purchaseNo),
      emptyToNull(item.localSupplier), emptyToNull(item.supplierAddress), item.purchaseDate,
      item.purchaseType, emptyToNull(item.challanNo), emptyToNull(item.challanDate),
      emptyToNull(item.notes), item.status, id, req.user!.companyId],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'site_purchase', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before), JSON.stringify(item)],
  );
  return res.json({ id, message: 'Site purchase updated.' });
});

function pagination(query: AuthRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

sitePurchasesRouter.get('/:id/materials', requirePermission('site_purchases.view'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const purchase = await accessiblePurchase(req.user!, purchaseId);
  if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
  const { page, pageSize, offset } = pagination(req.query);
  const search = String(req.query.search ?? '').trim();
  const like = `%${search}%`;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT spm.id, spm.material_id AS materialId, m.name AS materialName, spm.unit_id AS unitId,
            u.name AS unitName, spm.site_id AS siteId, s.name AS siteName, spm.entry_date AS entryDate,
            spm.quantity, spm.unit_price AS unitPrice, spm.discount,
            spm.total_amount AS totalAmount, spm.notes
       FROM app_site_purchase_materials spm
       JOIN app_materials m ON m.id = spm.material_id
       LEFT JOIN app_units u ON u.id = spm.unit_id
       LEFT JOIN app_project_sites s ON s.id = spm.site_id
      WHERE spm.purchase_id = ? AND (? = '' OR m.name LIKE ? OR s.name LIKE ? OR spm.notes LIKE ?)
      ORDER BY spm.entry_date DESC, spm.id DESC LIMIT ? OFFSET ?`,
    [purchaseId, search, like, like, like, pageSize, offset],
  );
  const [[total]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM app_site_purchase_materials spm
       JOIN app_materials m ON m.id = spm.material_id LEFT JOIN app_project_sites s ON s.id = spm.site_id
      WHERE spm.purchase_id = ? AND (? = '' OR m.name LIKE ? OR s.name LIKE ? OR spm.notes LIKE ?)`,
    [purchaseId, search, like, like, like],
  );
  return res.json({ items: rows, page, pageSize, total: Number(total?.count ?? 0) });
});

sitePurchasesRouter.post('/:id/materials', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const parsed = materialLineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !parsed.success) return res.status(400).json({ message: 'Check the material entry.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
    const item = parsed.data;
    const [materials] = await connection.query<RowDataPacket[]>('SELECT id FROM app_materials WHERE id = ? AND company_id = ? AND status = \'active\'', [item.materialId, req.user!.companyId]);
    if (!materials[0] || !(await validateSite(connection, item.siteId, Number(purchase.projectId)))) return res.status(400).json({ message: 'The selected material or project site is invalid.' });
    const totalAmount = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0));
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_site_purchase_materials
         (purchase_id, material_id, unit_id, site_id, entry_date, quantity, unit_price, discount, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchaseId, item.materialId, item.unitId ?? null, item.siteId ?? null, item.entryDate,
        item.quantity, item.unitPrice, item.discount ?? 0, totalAmount, emptyToNull(item.notes)],
    );
    return res.status(201).json({ id: result.insertId, totalAmount, message: 'Material entry added.' });
  } finally {
    connection.release();
  }
});

sitePurchasesRouter.put('/:id/materials/:lineId', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  const parsed = materialLineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId) || !parsed.success) return res.status(400).json({ message: 'Check the material entry.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
    const item = parsed.data;
    const [materials] = await connection.query<RowDataPacket[]>('SELECT id FROM app_materials WHERE id = ? AND company_id = ? AND status = \'active\'', [item.materialId, req.user!.companyId]);
    if (!materials[0] || !(await validateSite(connection, item.siteId, Number(purchase.projectId)))) return res.status(400).json({ message: 'The selected material or project site is invalid.' });
    const totalAmount = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0));
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE app_site_purchase_materials SET material_id = ?, unit_id = ?, site_id = ?, entry_date = ?,
         quantity = ?, unit_price = ?, discount = ?, total_amount = ?, notes = ?
       WHERE id = ? AND purchase_id = ?`,
      [item.materialId, item.unitId ?? null, item.siteId ?? null, item.entryDate, item.quantity,
        item.unitPrice, item.discount ?? 0, totalAmount, emptyToNull(item.notes), lineId, purchaseId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Material entry not found.' });
    return res.json({ id: lineId, totalAmount, message: 'Material entry updated.' });
  } finally {
    connection.release();
  }
});

sitePurchasesRouter.delete('/:id/materials/:lineId', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId)) return res.status(400).json({ message: 'Invalid material entry.' });
  if (!(await accessiblePurchase(req.user!, purchaseId))) return res.status(404).json({ message: 'Site purchase not found.' });
  const [result] = await db.query<ResultSetHeader>('DELETE FROM app_site_purchase_materials WHERE id = ? AND purchase_id = ?', [lineId, purchaseId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Material entry not found.' });
  return res.status(204).send();
});

sitePurchasesRouter.get('/:id/expenses', requirePermission('site_purchases.view'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const purchase = await accessiblePurchase(req.user!, purchaseId);
  if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
  const { page, pageSize, offset } = pagination(req.query);
  const search = String(req.query.search ?? '').trim();
  const like = `%${search}%`;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT spe.id, spe.expense_head_id AS expenseHeadId, COALESCE(eh.name, 'Unspecified expense') AS expenseHeadName,
            spe.site_id AS siteId, s.name AS siteName, spe.entry_date AS entryDate,
            spe.amount, spe.notes
       FROM app_site_purchase_expenses spe
       LEFT JOIN app_engineer_expense_heads eh ON eh.id = spe.expense_head_id
       LEFT JOIN app_project_sites s ON s.id = spe.site_id
      WHERE spe.purchase_id = ? AND (? = '' OR eh.name LIKE ? OR s.name LIKE ? OR spe.notes LIKE ?)
      ORDER BY spe.entry_date DESC, spe.id DESC LIMIT ? OFFSET ?`,
    [purchaseId, search, like, like, like, pageSize, offset],
  );
  const [[total]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM app_site_purchase_expenses spe
       LEFT JOIN app_engineer_expense_heads eh ON eh.id = spe.expense_head_id
       LEFT JOIN app_project_sites s ON s.id = spe.site_id
      WHERE spe.purchase_id = ? AND (? = '' OR eh.name LIKE ? OR s.name LIKE ? OR spe.notes LIKE ?)`,
    [purchaseId, search, like, like, like],
  );
  return res.json({ items: rows, page, pageSize, total: Number(total?.count ?? 0) });
});

sitePurchasesRouter.post('/:id/expenses', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const parsed = expenseLineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !parsed.success) return res.status(400).json({ message: 'Check the site expense entry.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
    const item = parsed.data;
    if (item.expenseHeadId) {
      const [heads] = await connection.query<RowDataPacket[]>('SELECT id FROM app_engineer_expense_heads WHERE id = ? AND company_id = ? AND status = \'active\'', [item.expenseHeadId, req.user!.companyId]);
      if (!heads[0]) return res.status(400).json({ message: 'The selected expense head is invalid.' });
    }
    if (!(await validateSite(connection, item.siteId, Number(purchase.projectId)))) return res.status(400).json({ message: 'The selected project site is invalid.' });
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_site_purchase_expenses (purchase_id, expense_head_id, site_id, entry_date, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [purchaseId, item.expenseHeadId ?? null, item.siteId ?? null, item.entryDate, item.amount, emptyToNull(item.notes)],
    );
    return res.status(201).json({ id: result.insertId, message: 'Site expense added.' });
  } finally {
    connection.release();
  }
});

sitePurchasesRouter.put('/:id/expenses/:lineId', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  const parsed = expenseLineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId) || !parsed.success) return res.status(400).json({ message: 'Check the site expense entry.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Site purchase not found.' });
    const item = parsed.data;
    if (item.expenseHeadId) {
      const [heads] = await connection.query<RowDataPacket[]>('SELECT id FROM app_engineer_expense_heads WHERE id = ? AND company_id = ? AND status = \'active\'', [item.expenseHeadId, req.user!.companyId]);
      if (!heads[0]) return res.status(400).json({ message: 'The selected expense head is invalid.' });
    }
    if (!(await validateSite(connection, item.siteId, Number(purchase.projectId)))) return res.status(400).json({ message: 'The selected project site is invalid.' });
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE app_site_purchase_expenses SET expense_head_id = ?, site_id = ?, entry_date = ?, amount = ?, notes = ?
       WHERE id = ? AND purchase_id = ?`,
      [item.expenseHeadId ?? null, item.siteId ?? null, item.entryDate, item.amount, emptyToNull(item.notes), lineId, purchaseId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Site expense entry not found.' });
    return res.json({ id: lineId, message: 'Site expense updated.' });
  } finally {
    connection.release();
  }
});

sitePurchasesRouter.delete('/:id/expenses/:lineId', requirePermission('site_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId)) return res.status(400).json({ message: 'Invalid site expense entry.' });
  if (!(await accessiblePurchase(req.user!, purchaseId))) return res.status(404).json({ message: 'Site purchase not found.' });
  const [result] = await db.query<ResultSetHeader>('DELETE FROM app_site_purchase_expenses WHERE id = ? AND purchase_id = ?', [lineId, purchaseId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Site expense entry not found.' });
  return res.status(204).send();
});

sitePurchasesRouter.get('/:id/delete-check', requirePermission('site_purchases.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid site purchase.' });
  if (!(await accessiblePurchase(req.user!, id))) return res.status(404).json({ message: 'Site purchase not found.' });
  const [[counts]] = await db.query<RowDataPacket[]>(
    `SELECT (SELECT COUNT(*) FROM app_site_purchase_materials WHERE purchase_id = ?) AS materials,
            (SELECT COUNT(*) FROM app_site_purchase_expenses WHERE purchase_id = ?) AS expenses`, [id, id],
  );
  const references = { materials: Number(counts?.materials ?? 0), expenses: Number(counts?.expenses ?? 0) };
  return res.json({ canDelete: references.materials + references.expenses === 0, references });
});

sitePurchasesRouter.delete('/:id', requirePermission('site_purchases.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid site purchase.' });
  if (!(await accessiblePurchase(req.user!, id))) return res.status(404).json({ message: 'Site purchase not found.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM app_site_purchases WHERE id = ? AND company_id = ? LIMIT 1 FOR UPDATE', [id, req.user!.companyId]);
    if (!rows[0]) {
      await connection.rollback();
      return res.status(404).json({ message: 'Site purchase not found.' });
    }
    const [[counts]] = await connection.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM app_site_purchase_materials WHERE purchase_id = ?) AS materials,
              (SELECT COUNT(*) FROM app_site_purchase_expenses WHERE purchase_id = ?) AS expenses`, [id, id],
    );
    if (Number(counts?.materials ?? 0) + Number(counts?.expenses ?? 0) > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Remove all material and expense entries before deleting this purchase.' });
    }
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'site_purchase', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(rows[0])],
    );
    await connection.query('DELETE FROM app_site_purchases WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
