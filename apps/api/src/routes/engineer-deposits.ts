import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const engineerDepositsRouter = Router();
engineerDepositsRouter.use(authenticate);

const depositSchema = z.object({
  employeeId: z.number().int().positive(),
  depositDate: z.string().date(),
  amount: z.number().positive().max(999999999999.99).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001),
  referenceNo: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100);
interface LedgerItem {
  id: number;
  type: string;
  transactionDate: string | null;
  referenceNo: string | null;
  projectId: number | null;
  projectCode: string | null;
  projectName: string | null;
  siteName: string;
  description: string;
  credit: number;
  debit: number;
  notes: string | null;
  siteId: number | null;
  purchaseId: number;
  balance: number;
}

async function accessibleEngineer(
  user: NonNullable<AuthRequest['user']>,
  employeeId: number,
  connection: Pool | PoolConnection = db,
) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT e.id AS employeeId,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS employeeName,
            e.employee_code AS employeeCode,
            w.id AS walletId
       FROM app_employees e
       LEFT JOIN app_engineer_wallets w ON w.company_id = e.company_id AND w.employee_id = e.id
      WHERE e.id = ? AND e.company_id = ?
        AND (? = 'programmer' OR (
          EXISTS (SELECT 1 FROM app_employee_projects ep
                   JOIN app_user_projects up ON up.project_id = ep.project_id AND up.user_id = ?
                  WHERE ep.employee_id = e.id)
          AND NOT EXISTS (SELECT 1 FROM app_employee_projects ep
                           LEFT JOIN app_user_projects up ON up.project_id = ep.project_id AND up.user_id = ?
                          WHERE ep.employee_id = e.id AND up.user_id IS NULL)
          AND NOT EXISTS (SELECT 1 FROM app_site_purchases sp
                           LEFT JOIN app_user_projects up ON up.project_id = sp.project_id AND up.user_id = ?
                          WHERE sp.employee_id = e.id AND up.user_id IS NULL)
          AND NOT EXISTS (SELECT 1 FROM app_engineer_accounts a
                           LEFT JOIN app_user_projects up ON up.project_id = a.project_id AND up.user_id = ?
                          WHERE a.employee_id = e.id AND up.user_id IS NULL)
        )) LIMIT 1`,
    [employeeId, user.companyId, user.roleKey, user.id, user.id, user.id, user.id],
  );
  return row;
}

async function accessibleDeposit(user: NonNullable<AuthRequest['user']>, depositId: number, connection: Pool | PoolConnection = db) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT d.id, d.wallet_id AS walletId, w.employee_id AS employeeId
       FROM app_engineer_deposits d
       JOIN app_engineer_wallets w ON w.id = d.wallet_id
      WHERE d.id = ? AND w.company_id = ? LIMIT 1`,
    [depositId, user.companyId],
  );
  return row && await accessibleEngineer(user, Number(row.employeeId), connection) ? row : null;
}

engineerDepositsRouter.get('/options', requirePermission('engineer_deposits.view'), async (req: AuthRequest, res) => {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT p.id, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code, p.name
       FROM app_projects p LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY p.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [employees] = await db.query<RowDataPacket[]>(
    `SELECT e.id, e.employee_code AS employeeCode,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS name
       FROM app_employees e
      WHERE e.company_id = ? AND e.status = 'active'
      ORDER BY e.first_name, e.last_name`,
    [req.user!.companyId],
  );
  const visibleEmployees = [];
  for (const employee of employees) if (await accessibleEngineer(req.user!, Number(employee.id))) visibleEmployees.push(employee);
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND s.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY s.name`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ projects, employees: visibleEmployees, sites });
});

engineerDepositsRouter.get('/', requirePermission('engineer_deposits.view'), async (req: AuthRequest, res) => {
  const [identities] = await db.query<RowDataPacket[]>(
    `SELECT e.id AS employeeId, w.id AS walletId,
            e.employee_code AS employeeCode,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS employeeName
       FROM app_employees e
       LEFT JOIN app_engineer_wallets w ON w.company_id = e.company_id AND w.employee_id = e.id
      WHERE e.company_id = ? AND (w.id IS NOT NULL OR EXISTS
        (SELECT 1 FROM app_site_purchases sp WHERE sp.company_id = e.company_id AND sp.employee_id = e.id AND sp.status = 'posted'))
      ORDER BY employeeName`, [req.user!.companyId],
  );
  const [deposits] = await db.query<RowDataPacket[]>(
    `SELECT w.employee_id AS employeeId,
            COUNT(d.id) AS depositCount, COALESCE(SUM(d.amount), 0) AS deposited,
            MAX(d.deposit_date) AS lastDepositDate
       FROM app_engineer_wallets w LEFT JOIN app_engineer_deposits d ON d.wallet_id = w.id
      WHERE w.company_id = ? GROUP BY w.employee_id`,
    [req.user!.companyId],
  );
  const [purchases] = await db.query<RowDataPacket[]>(
    `SELECT sp.employee_id AS employeeId,
            COUNT(*) AS purchaseCount, COUNT(DISTINCT sp.project_id) AS projectCount,
            COALESCE(SUM(line_totals.materialTotal), 0) AS materialTotal,
            COALESCE(SUM(line_totals.expenseTotal), 0) AS expenseTotal,
            MAX(line_totals.lastPurchaseDate) AS lastPurchaseDate
       FROM app_site_purchases sp
       LEFT JOIN (
         SELECT source.purchaseId, SUM(source.materialTotal) AS materialTotal,
                SUM(source.expenseTotal) AS expenseTotal, MAX(source.activityDate) AS lastPurchaseDate
           FROM (
             SELECT m.purchase_id AS purchaseId, COALESCE(SUM(m.total_amount), 0) AS materialTotal,
                    0 AS expenseTotal, MAX(m.entry_date) AS activityDate
               FROM app_site_purchase_materials m GROUP BY m.purchase_id
             UNION ALL
             SELECT x.purchase_id, 0, COALESCE(SUM(x.amount), 0), MAX(x.entry_date)
               FROM app_site_purchase_expenses x GROUP BY x.purchase_id
           ) source GROUP BY source.purchaseId
       ) line_totals ON line_totals.purchaseId = sp.id
      WHERE sp.company_id = ? AND sp.status = 'posted'
      GROUP BY sp.employee_id`,
    [req.user!.companyId],
  );
  const depositMap = new Map(deposits.map((row) => [Number(row.employeeId), row]));
  const purchaseMap = new Map(purchases.map((row) => [Number(row.employeeId), row]));
  const accounts = [];
  for (const row of identities) {
    if (!(await accessibleEngineer(req.user!, Number(row.employeeId)))) continue;
    const deposit = depositMap.get(Number(row.employeeId));
    const purchase = purchaseMap.get(Number(row.employeeId));
    const deposited = cents(deposit?.deposited) / 100;
    const materialTotal = cents(purchase?.materialTotal) / 100;
    const expenseTotal = cents(purchase?.expenseTotal) / 100;
    accounts.push({
      ...row, depositCount: Number(deposit?.depositCount ?? 0), deposited,
      purchaseCount: Number(purchase?.purchaseCount ?? 0), projectCount: Number(purchase?.projectCount ?? 0),
      materialTotal, expenseTotal, purchased: (cents(materialTotal) + cents(expenseTotal)) / 100,
      balance: (cents(deposited) - cents(materialTotal) - cents(expenseTotal)) / 100,
      lastActivityDate: [deposit?.lastDepositDate, purchase?.lastPurchaseDate].filter(Boolean).sort().at(-1) ?? null,
    });
  }
  return res.json({ accounts });
});

engineerDepositsRouter.get('/ledger', requirePermission('engineer_deposits.view'), async (req: AuthRequest, res) => {
  const employeeId = Number(req.query.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ message: 'Select a valid engineer.' });
  const identity = await accessibleEngineer(req.user!, employeeId);
  if (!identity) return res.status(404).json({ message: 'Engineer ledger not found.' });
  const depositRows = identity.walletId ? (await db.query<RowDataPacket[]>(
    `SELECT d.id, 'deposit' AS type, d.deposit_date AS transactionDate,
            d.reference_no AS referenceNo, d.project_id AS projectId,
            COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode,
            p.name AS projectName, s.name AS siteName,
            COALESCE(NULLIF(d.notes, ''), 'Funds received by engineer') AS description, d.amount AS credit, 0 AS debit,
            d.notes, d.site_id AS siteId, 0 AS purchaseId
       FROM app_engineer_deposits d
       LEFT JOIN app_projects p ON p.id = d.project_id
       LEFT JOIN app_project_sites s ON s.id = d.site_id
      WHERE d.wallet_id = ?`, [identity.walletId],
  ))[0] : [];
  const [materialRows] = await db.query<RowDataPacket[]>(
    `SELECT m.id, 'material' AS type, m.entry_date AS transactionDate,
            COALESCE(sp.purchase_no, CONCAT('PUR-', sp.id)) AS referenceNo,
            sp.project_id AS projectId, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode,
            p.name AS projectName, s.name AS siteName,
            CONCAT(COALESCE(mat.name, 'Unspecified legacy material'), CASE WHEN COALESCE(m.quantity, 0) > 0 THEN CONCAT(' · ', m.quantity, ' ', COALESCE(u.code, u.name, '')) ELSE '' END) AS description,
            0 AS credit, m.total_amount AS debit, m.notes, m.site_id AS siteId, sp.id AS purchaseId
       FROM app_site_purchases sp JOIN app_site_purchase_materials m ON m.purchase_id = sp.id
       JOIN app_projects p ON p.id = sp.project_id
       LEFT JOIN app_materials mat ON mat.id = m.material_id LEFT JOIN app_units u ON u.id = m.unit_id
       LEFT JOIN app_project_sites s ON s.id = m.site_id
      WHERE sp.company_id = ? AND sp.employee_id = ? AND sp.status = 'posted'`,
    [req.user!.companyId, employeeId],
  );
  const [expenseRows] = await db.query<RowDataPacket[]>(
    `SELECT x.id, 'expense' AS type, x.entry_date AS transactionDate,
            COALESCE(sp.purchase_no, CONCAT('PUR-', sp.id)) AS referenceNo,
            sp.project_id AS projectId, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode,
            p.name AS projectName, s.name AS siteName,
            COALESCE(h.name, x.notes, 'Other site expense') AS description,
            0 AS credit, x.amount AS debit, x.notes, x.site_id AS siteId, sp.id AS purchaseId
       FROM app_site_purchases sp JOIN app_site_purchase_expenses x ON x.purchase_id = sp.id
       JOIN app_projects p ON p.id = sp.project_id
       LEFT JOIN app_engineer_expense_heads h ON h.id = x.expense_head_id
       LEFT JOIN app_project_sites s ON s.id = x.site_id
      WHERE sp.company_id = ? AND sp.employee_id = ? AND sp.status = 'posted'`,
    [req.user!.companyId, employeeId],
  );
  const transactions: LedgerItem[] = [...depositRows, ...materialRows, ...expenseRows]
    .map((row) => ({ ...row, credit: Number(row.credit ?? 0), debit: Number(row.debit ?? 0), balance: 0 } as LedgerItem))
    .sort((a, b) => String(a.transactionDate ?? '').localeCompare(String(b.transactionDate ?? '')) ||
      (a.type === 'deposit' ? -1 : b.type === 'deposit' ? 1 : String(a.type).localeCompare(String(b.type))) || Number(a.id) - Number(b.id));
  let runningCents = 0;
  for (const item of transactions) {
    runningCents += cents(item.credit) - cents(item.debit);
    item.balance = runningCents / 100;
  }
  const deposited = transactions.reduce((sum, item) => sum + cents(item.credit), 0) / 100;
  const purchased = transactions.reduce((sum, item) => sum + cents(item.debit), 0) / 100;
  return res.json({
    ledger: { ...identity, deposited, purchased, balance: runningCents / 100 },
    transactions: transactions.reverse(),
  });
});

engineerDepositsRouter.post('/deposits', requirePermission('engineer_deposits.manage'), async (req: AuthRequest, res) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid engineer, date, and positive amount with no more than two decimal places.' });
  const item = parsed.data;
  if (!(await accessibleEngineer(req.user!, item.employeeId))) return res.status(404).json({ message: 'Engineer not found or project access is incomplete.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO app_engineer_wallets (company_id, employee_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = id`, [req.user!.companyId, item.employeeId],
    );
    const [[wallet]] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM app_engineer_wallets WHERE company_id = ? AND employee_id = ? LIMIT 1 FOR UPDATE',
      [req.user!.companyId, item.employeeId],
    );
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_engineer_deposits (wallet_id, deposit_date, amount, reference_no, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [wallet!.id, item.depositDate, item.amount, emptyToNull(item.referenceNo), emptyToNull(item.notes)],
    );
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
       VALUES (?, ?, 'create', 'engineer_deposit', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(item)],
    );
    await connection.commit();
    return res.status(201).json({ id: result.insertId, walletId: wallet!.id, message: 'Engineer deposit recorded.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

engineerDepositsRouter.put('/deposits/:id', requirePermission('engineer_deposits.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = depositSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Enter valid deposit information.' });
  const current = await accessibleDeposit(req.user!, id);
  if (!current) return res.status(404).json({ message: 'Deposit transaction not found.' });
  const item = parsed.data;
  if (Number(current.employeeId) !== item.employeeId) {
    return res.status(409).json({ message: 'The engineer cannot be changed on an existing deposit.' });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[before]] = await connection.query<RowDataPacket[]>('SELECT * FROM app_engineer_deposits WHERE id = ? FOR UPDATE', [id]);
    await connection.query(
      `UPDATE app_engineer_deposits SET deposit_date = ?, amount = ?, reference_no = ?, notes = ? WHERE id = ?`,
      [item.depositDate, item.amount, emptyToNull(item.referenceNo), emptyToNull(item.notes), id],
    );
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, ?, 'update', 'engineer_deposit', ?, ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before), JSON.stringify(item)],
    );
    await connection.commit();
    return res.json({ id, message: 'Deposit transaction updated.' });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
});

engineerDepositsRouter.delete('/deposits/:id', requirePermission('engineer_deposits.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid deposit transaction.' });
  if (!(await accessibleDeposit(req.user!, id))) return res.status(404).json({ message: 'Deposit transaction not found.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[before]] = await connection.query<RowDataPacket[]>('SELECT * FROM app_engineer_deposits WHERE id = ? FOR UPDATE', [id]);
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'engineer_deposit', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before)],
    );
    await connection.query('DELETE FROM app_engineer_deposits WHERE id = ?', [id]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
