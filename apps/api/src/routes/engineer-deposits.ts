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
  projectId: z.number().int().positive(),
  siteId: z.number().int().positive().optional().nullable(),
  depositDate: z.string().date(),
  amount: z.number().positive().max(999999999999.99),
  referenceNo: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;
const pairKey = (employeeId: number, projectId: number) => `${employeeId}:${projectId}`;
interface LedgerItem {
  id: number;
  type: string;
  transactionDate: string | null;
  referenceNo: string | null;
  siteName: string;
  description: string;
  credit: number;
  debit: number;
  notes: string | null;
  siteId: number | null;
  purchaseId: number;
  balance: number;
}

async function accessiblePair(
  user: NonNullable<AuthRequest['user']>,
  employeeId: number,
  projectId: number,
  connection: Pool | PoolConnection = db,
) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT p.id AS projectId, e.id AS employeeId,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS employeeName,
            e.employee_code AS employeeCode,
            COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode, p.name AS projectName
       FROM app_projects p
       JOIN app_employees e ON e.id = ? AND e.company_id = p.company_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [employeeId, user.id, projectId, user.companyId, user.roleKey],
  );
  return row;
}

async function validAssignment(connection: Pool | PoolConnection, employeeId: number, projectId: number) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    'SELECT employee_id FROM app_employee_projects WHERE employee_id = ? AND project_id = ? LIMIT 1',
    [employeeId, projectId],
  );
  return Boolean(row);
}

async function validSite(connection: Pool | PoolConnection, siteId: number | null | undefined, projectId: number) {
  if (!siteId) return true;
  const [[row]] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? LIMIT 1',
    [siteId, projectId],
  );
  return Boolean(row);
}

async function accessibleDeposit(user: NonNullable<AuthRequest['user']>, depositId: number, connection: Pool | PoolConnection = db) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT d.id, d.account_id AS accountId, a.employee_id AS employeeId, a.project_id AS projectId
       FROM app_engineer_deposits d
       JOIN app_engineer_accounts a ON a.id = d.account_id
       JOIN app_projects p ON p.id = a.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE d.id = ? AND a.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, depositId, user.companyId, user.roleKey],
  );
  return row;
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
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS name,
            ep.project_id AS projectId
       FROM app_employees e JOIN app_employee_projects ep ON ep.employee_id = e.id
       JOIN app_projects p ON p.id = ep.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE e.company_id = ? AND e.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY e.first_name, e.last_name`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND s.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY s.name`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ projects, employees, sites });
});

engineerDepositsRouter.get('/', requirePermission('engineer_deposits.view'), async (req: AuthRequest, res) => {
  const [identities] = await db.query<RowDataPacket[]>(
    `SELECT ledger.employeeId, ledger.projectId, a.id AS accountId,
            e.employee_code AS employeeCode,
            CONCAT_WS(' ', NULLIF(TRIM(e.first_name), ''), NULLIF(TRIM(e.last_name), '')) AS employeeName,
            COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode, p.name AS projectName
       FROM (
         SELECT employee_id AS employeeId, project_id AS projectId
           FROM app_engineer_accounts WHERE company_id = ?
         UNION
         SELECT employee_id, project_id FROM app_site_purchases
          WHERE company_id = ? AND status = 'posted'
       ) ledger
       JOIN app_employees e ON e.id = ledger.employeeId
       JOIN app_projects p ON p.id = ledger.projectId
       LEFT JOIN app_engineer_accounts a ON a.company_id = ? AND a.employee_id = ledger.employeeId AND a.project_id = ledger.projectId
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY e.first_name, e.last_name, p.id DESC`,
    [req.user!.companyId, req.user!.companyId, req.user!.companyId, req.user!.id, req.user!.roleKey],
  );
  const [deposits] = await db.query<RowDataPacket[]>(
    `SELECT a.employee_id AS employeeId, a.project_id AS projectId,
            COUNT(d.id) AS depositCount, COALESCE(SUM(d.amount), 0) AS deposited,
            MAX(d.deposit_date) AS lastDepositDate
       FROM app_engineer_accounts a LEFT JOIN app_engineer_deposits d ON d.account_id = a.id
      WHERE a.company_id = ? GROUP BY a.employee_id, a.project_id`,
    [req.user!.companyId],
  );
  const [purchases] = await db.query<RowDataPacket[]>(
    `SELECT sp.employee_id AS employeeId, sp.project_id AS projectId,
            COUNT(*) AS purchaseCount, COALESCE(SUM(line_totals.materialTotal), 0) AS materialTotal,
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
      GROUP BY sp.employee_id, sp.project_id`,
    [req.user!.companyId],
  );
  const depositMap = new Map(deposits.map((row) => [pairKey(Number(row.employeeId), Number(row.projectId)), row]));
  const purchaseMap = new Map(purchases.map((row) => [pairKey(Number(row.employeeId), Number(row.projectId)), row]));
  const accounts = identities.map((row) => {
    const key = pairKey(Number(row.employeeId), Number(row.projectId));
    const deposit = depositMap.get(key);
    const purchase = purchaseMap.get(key);
    const deposited = Number(deposit?.deposited ?? 0);
    const materialTotal = Number(purchase?.materialTotal ?? 0);
    const expenseTotal = Number(purchase?.expenseTotal ?? 0);
    return {
      ...row,
      depositCount: Number(deposit?.depositCount ?? 0), deposited,
      purchaseCount: Number(purchase?.purchaseCount ?? 0), materialTotal, expenseTotal,
      purchased: materialTotal + expenseTotal, balance: deposited - materialTotal - expenseTotal,
      lastActivityDate: [deposit?.lastDepositDate, purchase?.lastPurchaseDate].filter(Boolean).sort().at(-1) ?? null,
    };
  });
  return res.json({ accounts });
});

engineerDepositsRouter.get('/ledger', requirePermission('engineer_deposits.view'), async (req: AuthRequest, res) => {
  const employeeId = Number(req.query.employeeId);
  const projectId = Number(req.query.projectId);
  if (!Number.isInteger(employeeId) || !Number.isInteger(projectId)) return res.status(400).json({ message: 'Select a valid engineer and project.' });
  const identity = await accessiblePair(req.user!, employeeId, projectId);
  if (!identity) return res.status(404).json({ message: 'Engineer ledger not found.' });
  const [[account]] = await db.query<RowDataPacket[]>(
    'SELECT id, opened_on AS openedOn FROM app_engineer_accounts WHERE company_id = ? AND employee_id = ? AND project_id = ? LIMIT 1',
    [req.user!.companyId, employeeId, projectId],
  );
  const depositRows = account ? (await db.query<RowDataPacket[]>(
    `SELECT d.id, 'deposit' AS type, d.deposit_date AS transactionDate,
            d.reference_no AS referenceNo, COALESCE(s.name, '') AS siteName,
            COALESCE(d.notes, 'Funds received') AS description, d.amount AS credit, 0 AS debit,
            d.notes, d.site_id AS siteId, 0 AS purchaseId
       FROM app_engineer_deposits d LEFT JOIN app_project_sites s ON s.id = d.site_id
      WHERE d.account_id = ?`, [account.id],
  ))[0] : [];
  const [materialRows] = await db.query<RowDataPacket[]>(
    `SELECT m.id, 'material' AS type, m.entry_date AS transactionDate,
            COALESCE(sp.purchase_no, CONCAT('PUR-', sp.id)) AS referenceNo, COALESCE(s.name, '') AS siteName,
            CONCAT(COALESCE(mat.name, 'Unspecified legacy material'), CASE WHEN COALESCE(m.quantity, 0) > 0 THEN CONCAT(' · ', m.quantity, ' ', COALESCE(u.code, u.name, '')) ELSE '' END) AS description,
            0 AS credit, m.total_amount AS debit, m.notes, m.site_id AS siteId, sp.id AS purchaseId
       FROM app_site_purchases sp JOIN app_site_purchase_materials m ON m.purchase_id = sp.id
       LEFT JOIN app_materials mat ON mat.id = m.material_id LEFT JOIN app_units u ON u.id = m.unit_id
       LEFT JOIN app_project_sites s ON s.id = m.site_id
      WHERE sp.company_id = ? AND sp.employee_id = ? AND sp.project_id = ? AND sp.status = 'posted'`,
    [req.user!.companyId, employeeId, projectId],
  );
  const [expenseRows] = await db.query<RowDataPacket[]>(
    `SELECT x.id, 'expense' AS type, x.entry_date AS transactionDate,
            COALESCE(sp.purchase_no, CONCAT('PUR-', sp.id)) AS referenceNo, COALESCE(s.name, '') AS siteName,
            COALESCE(h.name, x.notes, 'Other site expense') AS description,
            0 AS credit, x.amount AS debit, x.notes, x.site_id AS siteId, sp.id AS purchaseId
       FROM app_site_purchases sp JOIN app_site_purchase_expenses x ON x.purchase_id = sp.id
       LEFT JOIN app_engineer_expense_heads h ON h.id = x.expense_head_id
       LEFT JOIN app_project_sites s ON s.id = x.site_id
      WHERE sp.company_id = ? AND sp.employee_id = ? AND sp.project_id = ? AND sp.status = 'posted'`,
    [req.user!.companyId, employeeId, projectId],
  );
  const transactions: LedgerItem[] = [...depositRows, ...materialRows, ...expenseRows]
    .map((row) => ({ ...row, credit: Number(row.credit), debit: Number(row.debit), balance: 0 } as LedgerItem))
    .sort((a, b) => String(a.transactionDate ?? '').localeCompare(String(b.transactionDate ?? '')) ||
      (a.type === 'deposit' ? -1 : b.type === 'deposit' ? 1 : String(a.type).localeCompare(String(b.type))) || Number(a.id) - Number(b.id));
  let runningBalance = 0;
  for (const item of transactions) {
    runningBalance += item.credit - item.debit;
    item.balance = runningBalance;
  }
  const deposited = transactions.reduce((sum, item) => sum + item.credit, 0);
  const purchased = transactions.reduce((sum, item) => sum + item.debit, 0);
  return res.json({
    ledger: { ...identity, accountId: account?.id ?? null, openedOn: account?.openedOn ?? null, deposited, purchased, balance: deposited - purchased },
    transactions: transactions.reverse(),
  });
});

engineerDepositsRouter.post('/deposits', requirePermission('engineer_deposits.manage'), async (req: AuthRequest, res) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid engineer, project, date, and positive amount.' });
  const item = parsed.data;
  if (!(await accessiblePair(req.user!, item.employeeId, item.projectId))) return res.status(404).json({ message: 'Engineer or project not found.' });
  if (!(await validAssignment(db, item.employeeId, item.projectId))) return res.status(400).json({ message: 'Assign this engineer to the selected project before recording a deposit.' });
  if (!(await validSite(db, item.siteId, item.projectId))) return res.status(400).json({ message: 'The selected site does not belong to this project.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO app_engineer_accounts (company_id, project_id, employee_id, opened_on)
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [req.user!.companyId, item.projectId, item.employeeId, item.depositDate],
    );
    const [[account]] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM app_engineer_accounts WHERE company_id = ? AND employee_id = ? AND project_id = ? LIMIT 1 FOR UPDATE',
      [req.user!.companyId, item.employeeId, item.projectId],
    );
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_engineer_deposits (account_id, project_id, site_id, deposit_date, amount, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [account!.id, item.projectId, item.siteId ?? null, item.depositDate, item.amount, emptyToNull(item.referenceNo), emptyToNull(item.notes)],
    );
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
       VALUES (?, ?, 'create', 'engineer_deposit', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(item)],
    );
    await connection.commit();
    return res.status(201).json({ id: result.insertId, accountId: account!.id, message: 'Engineer deposit recorded.' });
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
  if (Number(current.employeeId) !== item.employeeId || Number(current.projectId) !== item.projectId) {
    return res.status(409).json({ message: 'The engineer and project cannot be changed on an existing deposit.' });
  }
  if (!(await validSite(db, item.siteId, item.projectId))) return res.status(400).json({ message: 'The selected site does not belong to this project.' });
  const [[before]] = await db.query<RowDataPacket[]>('SELECT * FROM app_engineer_deposits WHERE id = ?', [id]);
  await db.query(
    `UPDATE app_engineer_deposits SET project_id = ?, site_id = ?, deposit_date = ?, amount = ?, reference_no = ?, notes = ? WHERE id = ?`,
    [item.projectId, item.siteId ?? null, item.depositDate, item.amount, emptyToNull(item.referenceNo), emptyToNull(item.notes), id],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'engineer_deposit', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before), JSON.stringify(item)],
  );
  return res.json({ id, message: 'Deposit transaction updated.' });
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
