import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const corporateTransfersRouter = Router();
corporateTransfersRouter.use(authenticate);

const optionalText = (length: number) => z.string().trim().max(length).optional().nullable();
const headerSchema = z.object({
  transferNo: optionalText(120),
  fromProjectId: z.number().int().positive(),
  fromSiteId: z.number().int().positive().optional().nullable(),
  receiveProjectId: z.number().int().positive(),
  receiveSiteId: z.number().int().positive().optional().nullable(),
  transferDate: z.string().date(),
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['draft', 'posted', 'cancelled']),
});
const lineSchema = z.object({
  categoryId: z.number().int().positive(),
  productId: z.number().int().positive(),
  unitId: z.number().int().positive().optional().nullable(),
  destinationSiteId: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  otherCost: z.number().nonnegative().optional().nullable(),
  otherExpense: z.number().nonnegative().optional().nullable(),
  notes: optionalText(500),
  transferDate: z.string().date().or(z.literal('')).optional().nullable(),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;
function pagination(query: AuthRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function accessibleTransfer(user: NonNullable<AuthRequest['user']>, id: number, connection: Pool | PoolConnection = db) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT ct.id, ct.from_project_id AS fromProjectId, ct.from_site_id AS fromSiteId,
            ct.receive_project_id AS receiveProjectId, ct.status
       FROM app_corporate_transfers ct
      WHERE ct.id = ? AND ct.company_id = ?
        AND (? = 'programmer' OR EXISTS (
          SELECT 1 FROM app_user_projects up
           WHERE up.user_id = ? AND up.project_id IN (ct.from_project_id, ct.receive_project_id)
        )) LIMIT 1`,
    [id, user.companyId, user.roleKey, user.id],
  );
  return rows[0];
}

async function validateHeader(user: NonNullable<AuthRequest['user']>, item: z.infer<typeof headerSchema>) {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT p.id FROM app_projects p
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.id IN (?, ?) AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      GROUP BY p.id`,
    [user.id, item.fromProjectId, item.receiveProjectId, user.companyId, user.roleKey],
  );
  if (new Set(projects.map((project) => Number(project.id))).size !== new Set([item.fromProjectId, item.receiveProjectId]).size) {
    return 'Both source and receiving projects must be valid and assigned to you.';
  }
  if (item.fromSiteId) {
    const [sites] = await db.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? AND status = \'active\' LIMIT 1', [item.fromSiteId, item.fromProjectId]);
    if (!sites[0]) return 'The source site does not belong to the source project.';
  }
  if (item.receiveSiteId) {
    const [sites] = await db.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? AND status = \'active\' LIMIT 1', [item.receiveSiteId, item.receiveProjectId]);
    if (!sites[0]) return 'The receiving site does not belong to the receiving project.';
  }
  if (item.fromProjectId === item.receiveProjectId && item.fromSiteId && item.fromSiteId === item.receiveSiteId) {
    return 'Source and receiving sites must be different.';
  }
  return null;
}

async function validateLine(
  connection: PoolConnection,
  user: NonNullable<AuthRequest['user']>,
  receiveProjectId: number,
  item: z.infer<typeof lineSchema>,
) {
  const [products] = await connection.query<RowDataPacket[]>(
    `SELECT id, category_id AS categoryId FROM app_corporate_products
      WHERE id = ? AND company_id = ? AND status = 'active' LIMIT 1`,
    [item.productId, user.companyId],
  );
  const product = products[0];
  if (!product) return { error: 'The selected corporate product is invalid.' };
  const categoryId = item.categoryId;
  if (!product.categoryId || Number(product.categoryId) !== item.categoryId) {
    return { error: 'The selected product does not belong to this category.' };
  }
  if (item.unitId) {
    const [units] = await connection.query<RowDataPacket[]>('SELECT id FROM app_units WHERE id = ? AND company_id = ? AND status = \'active\' LIMIT 1', [item.unitId, user.companyId]);
    if (!units[0]) return { error: 'The selected UOM is invalid.' };
  }
  if (item.destinationSiteId) {
    const [sites] = await connection.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? AND status = \'active\' LIMIT 1', [item.destinationSiteId, receiveProjectId]);
    if (!sites[0]) return { error: 'The line destination site does not belong to the receiving project.' };
  }
  return { categoryId };
}

async function availableStock(
  connection: Pool | PoolConnection,
  companyId: number,
  fromProjectId: number,
  fromSiteId: number | null,
  productId: number,
  excludeLineId: number | null = null,
  excludeTransferId: number | null = null,
) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT
       COALESCE((
         SELECT SUM(cpl.quantity)
           FROM app_corporate_purchase_lines cpl
           JOIN app_corporate_purchases cp ON cp.id = cpl.purchase_id
          WHERE cp.company_id = ? AND cp.project_id = ? AND cp.status = 'posted'
            AND cpl.product_id = ? AND (? IS NULL OR COALESCE(cpl.site_id, cp.site_id) = ?)
       ), 0)
       + COALESCE((
         SELECT SUM(ctl.quantity)
           FROM app_corporate_transfer_lines ctl
           JOIN app_corporate_transfers ct ON ct.id = ctl.transfer_id
          WHERE ct.company_id = ? AND ct.receive_project_id = ? AND ct.status = 'posted'
            AND ctl.product_id = ? AND (? IS NULL OR COALESCE(ctl.destination_site_id, ct.receive_site_id) = ?)
       ), 0)
       - COALESCE((
         SELECT SUM(ctl.quantity)
           FROM app_corporate_transfer_lines ctl
           JOIN app_corporate_transfers ct ON ct.id = ctl.transfer_id
          WHERE ct.company_id = ? AND ct.from_project_id = ? AND ct.status = 'posted'
            AND ctl.product_id = ? AND (? IS NULL OR ct.from_site_id = ?)
            AND (? IS NULL OR ctl.id <> ?) AND (? IS NULL OR ct.id <> ?)
       ), 0) AS availableStock`,
    [companyId, fromProjectId, productId, fromSiteId, fromSiteId,
      companyId, fromProjectId, productId, fromSiteId, fromSiteId,
      companyId, fromProjectId, productId, fromSiteId, fromSiteId,
      excludeLineId, excludeLineId, excludeTransferId, excludeTransferId],
  );
  return Number(row?.availableStock ?? 0);
}

async function reservedDraftQuantity(
  connection: Pool | PoolConnection,
  transferId: number,
  productId: number,
  excludeLineId: number | null,
) {
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(quantity), 0) AS reserved
       FROM app_corporate_transfer_lines
      WHERE transfer_id = ? AND product_id = ? AND (? IS NULL OR id <> ?)`,
    [transferId, productId, excludeLineId, excludeLineId],
  );
  return Number(row?.reserved ?? 0);
}

async function validateStock(
  connection: PoolConnection,
  user: NonNullable<AuthRequest['user']>,
  transfer: RowDataPacket,
  item: z.infer<typeof lineSchema>,
  excludeLineId: number | null = null,
) {
  await connection.query('SELECT id FROM app_corporate_products WHERE id = ? FOR UPDATE', [item.productId]);
  let stock = await availableStock(connection, user.companyId, Number(transfer.fromProjectId),
    transfer.fromSiteId ? Number(transfer.fromSiteId) : null, item.productId, excludeLineId);
  if (String(transfer.status) !== 'posted') {
    stock -= await reservedDraftQuantity(connection, Number(transfer.id), item.productId, excludeLineId);
  }
  if (item.quantity > stock + 0.00005) {
    return { error: `Insufficient source stock. Available: ${Math.max(0, stock).toLocaleString('en-BD', { maximumFractionDigits: 4 })}.`, availableStock: Math.max(0, stock) };
  }
  return { availableStock: Math.max(0, stock) };
}

async function validateTransferStock(
  connection: PoolConnection,
  user: NonNullable<AuthRequest['user']>,
  transferId: number,
  fromProjectId: number,
  fromSiteId: number | null,
) {
  const [lines] = await connection.query<RowDataPacket[]>(
    `SELECT product_id AS productId, SUM(quantity) AS quantity
       FROM app_corporate_transfer_lines WHERE transfer_id = ? AND product_id IS NOT NULL
      GROUP BY product_id ORDER BY product_id`, [transferId],
  );
  for (const line of lines) {
    await connection.query('SELECT id FROM app_corporate_products WHERE id = ? FOR UPDATE', [line.productId]);
    const stock = await availableStock(connection, user.companyId, fromProjectId, fromSiteId,
      Number(line.productId), null, transferId);
    if (Number(line.quantity) > stock + 0.00005) {
      const [[product]] = await connection.query<RowDataPacket[]>('SELECT name FROM app_corporate_products WHERE id = ?', [line.productId]);
      return `Insufficient source stock for ${product?.name ?? 'a corporate product'}. Available: ${Math.max(0, stock).toLocaleString('en-BD', { maximumFractionDigits: 4 })}.`;
    }
  }
  return null;
}

async function audit(req: AuthRequest, action: string, entityId: number, before: unknown, after: unknown) {
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, ?, 'corporate_transfer', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, action, String(entityId), before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
  );
}

corporateTransfersRouter.get('/options', requirePermission('corporate_transfers.view'), async (req: AuthRequest, res) => {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT p.id, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code, p.name,
            p.tender_id AS tenderId, p.address AS location
       FROM app_projects p LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND p.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY p.id DESC`, [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND s.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY s.name`, [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [categories] = await db.query<RowDataPacket[]>(
    `SELECT c.id, c.name FROM app_corporate_categories c
      WHERE c.company_id = ? AND c.status = 'active'
        AND EXISTS (SELECT 1 FROM app_corporate_products p WHERE p.category_id = c.id AND p.status = 'active')
      ORDER BY c.name`, [req.user!.companyId],
  );
  const [products] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.category_id AS categoryId, p.unit_id AS unitId, p.name, p.description,
            p.default_price AS defaultPrice, u.name AS unitName
       FROM app_corporate_products p LEFT JOIN app_units u ON u.id = p.unit_id
      WHERE p.company_id = ? AND p.status = 'active' ORDER BY p.name`, [req.user!.companyId],
  );
  const [units] = await db.query<RowDataPacket[]>('SELECT id, name, code FROM app_units WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  return res.json({ projects, sites, categories, products, units });
});

corporateTransfersRouter.get('/', requirePermission('corporate_transfers.view'), async (req: AuthRequest, res) => {
  const search = String(req.query.search ?? '').trim();
  const like = `%${search}%`;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ct.id, ct.transfer_no AS transferNo, ct.transfer_date AS transferDate, ct.status,
            ct.from_project_id AS fromProjectId, COALESCE(fp.package_no, fp.code, CONCAT('#', fp.id)) AS fromProjectCode,
            fp.name AS fromProjectName, fs.name AS fromSiteName,
            ct.receive_project_id AS receiveProjectId, COALESCE(rp.package_no, rp.code, CONCAT('#', rp.id)) AS receiveProjectCode,
            rp.name AS receiveProjectName, rs.name AS receiveSiteName,
            COUNT(ctl.id) AS itemCount, COALESCE(SUM(ctl.quantity), 0) AS totalQuantity,
            COALESCE(SUM(ctl.total_amount), 0) AS totalAmount
       FROM app_corporate_transfers ct
       JOIN app_projects fp ON fp.id = ct.from_project_id
       JOIN app_projects rp ON rp.id = ct.receive_project_id
       LEFT JOIN app_project_sites fs ON fs.id = ct.from_site_id
       LEFT JOIN app_project_sites rs ON rs.id = ct.receive_site_id
       LEFT JOIN app_corporate_transfer_lines ctl ON ctl.transfer_id = ct.id
      WHERE ct.company_id = ?
        AND (? = 'programmer' OR EXISTS (
          SELECT 1 FROM app_user_projects up
           WHERE up.user_id = ? AND up.project_id IN (ct.from_project_id, ct.receive_project_id)
        ))
        AND (? = '' OR ct.transfer_no LIKE ? OR fp.name LIKE ? OR rp.name LIKE ? OR fs.name LIKE ? OR rs.name LIKE ?)
      GROUP BY ct.id, fp.id, rp.id, fs.id, rs.id
      ORDER BY ct.transfer_date DESC, ct.id DESC`,
    [req.user!.companyId, req.user!.roleKey, req.user!.id, search, like, like, like, like, like],
  );
  const productNamesByTransfer = new Map<number, string[]>();
  if (rows.length) {
    const [products] = await db.query<RowDataPacket[]>(
      `SELECT ctl.transfer_id AS transferId, COALESCE(p.name, c.name, 'Unspecified item') AS productName
         FROM app_corporate_transfer_lines ctl
         LEFT JOIN app_corporate_products p ON p.id = ctl.product_id
         LEFT JOIN app_corporate_categories c ON c.id = ctl.category_id
        WHERE ctl.transfer_id IN (?)
        ORDER BY ctl.transfer_id, ctl.id`,
      [rows.map((row) => row.id)],
    );
    for (const product of products) {
      const transferId = Number(product.transferId);
      const names = productNamesByTransfer.get(transferId) ?? [];
      const name = String(product.productName);
      if (names.length < 2 && !names.includes(name)) names.push(name);
      productNamesByTransfer.set(transferId, names);
    }
  }
  return res.json({ transfers: rows.map((row) => ({ ...row, productNames: productNamesByTransfer.get(Number(row.id)) ?? [] })) });
});

corporateTransfersRouter.post('/', requirePermission('corporate_transfers.manage'), async (req: AuthRequest, res) => {
  const parsed = headerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the source, destination, and transfer date.' });
  const relationError = await validateHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  const item = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_corporate_transfers
       (company_id, transfer_no, from_project_id, from_site_id, receive_project_id, receive_site_id,
        transfer_date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, emptyToNull(item.transferNo), item.fromProjectId, item.fromSiteId ?? null,
      item.receiveProjectId, item.receiveSiteId ?? null, item.transferDate, emptyToNull(item.notes), item.status],
  );
  await audit(req, 'create', result.insertId, null, item);
  return res.status(201).json({ id: result.insertId, message: 'Corporate transfer created. Add product lines below.' });
});

corporateTransfersRouter.get('/:id', requirePermission('corporate_transfers.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await accessibleTransfer(req.user!, id))) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const [[transfer]] = await db.query<RowDataPacket[]>(
    `SELECT ct.id, ct.transfer_no AS transferNo, ct.from_project_id AS fromProjectId,
            ct.from_site_id AS fromSiteId, ct.receive_project_id AS receiveProjectId,
            ct.receive_site_id AS receiveSiteId, ct.transfer_date AS transferDate, ct.notes, ct.status,
            COUNT(ctl.id) AS itemCount, COALESCE(SUM(ctl.total_amount), 0) AS totalAmount
       FROM app_corporate_transfers ct
       LEFT JOIN app_corporate_transfer_lines ctl ON ctl.transfer_id = ct.id
      WHERE ct.id = ? AND ct.company_id = ? GROUP BY ct.id LIMIT 1`, [id, req.user!.companyId],
  );
  return res.json({ transfer });
});

corporateTransfersRouter.put('/:id', requirePermission('corporate_transfers.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = headerSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Check the corporate transfer information.' });
  const accessible = await accessibleTransfer(req.user!, id);
  if (!accessible) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const relationError = await validateHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  if (Number(accessible.fromProjectId) !== parsed.data.fromProjectId || Number(accessible.receiveProjectId) !== parsed.data.receiveProjectId) {
    const [[count]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS lines FROM app_corporate_transfer_lines WHERE transfer_id = ?', [id]);
    if (Number(count?.lines ?? 0) > 0) return res.status(409).json({ message: 'Remove product lines before changing either project.' });
  }
  const item = parsed.data;
  const connection = await db.getConnection();
  let before: RowDataPacket | undefined;
  try {
    await connection.beginTransaction();
    [[before]] = await connection.query<RowDataPacket[]>('SELECT * FROM app_corporate_transfers WHERE id = ? AND company_id = ? FOR UPDATE', [id, req.user!.companyId]);
    const sourceChanged = Number(before?.from_project_id) !== item.fromProjectId
      || Number(before?.from_site_id || 0) !== Number(item.fromSiteId || 0);
    if (item.status === 'posted' && (String(before?.status) !== 'posted' || sourceChanged)) {
      const stockError = await validateTransferStock(connection, req.user!, id, item.fromProjectId, item.fromSiteId ?? null);
      if (stockError) { await connection.rollback(); return res.status(409).json({ message: stockError }); }
    }
    await connection.query(
      `UPDATE app_corporate_transfers SET transfer_no = ?, from_project_id = ?, from_site_id = ?,
         receive_project_id = ?, receive_site_id = ?, transfer_date = ?, notes = ?, status = ?
       WHERE id = ? AND company_id = ?`,
      [emptyToNull(item.transferNo), item.fromProjectId, item.fromSiteId ?? null, item.receiveProjectId,
        item.receiveSiteId ?? null, item.transferDate, emptyToNull(item.notes), item.status, id, req.user!.companyId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  await audit(req, 'update', id, before, item);
  return res.json({ id, message: 'Corporate transfer updated.' });
});

corporateTransfersRouter.get('/:id/stock', requirePermission('corporate_transfers.view'), async (req: AuthRequest, res) => {
  const transferId = Number(req.params.id);
  const categoryId = Number(req.query.categoryId);
  const requestedLineId = req.query.lineId ? Number(req.query.lineId) : null;
  if (!Number.isInteger(transferId) || !Number.isInteger(categoryId) || categoryId <= 0) {
    return res.status(400).json({ message: 'Select a category to check source stock.' });
  }
  const transfer = await accessibleTransfer(req.user!, transferId);
  if (!transfer) return res.status(404).json({ message: 'Corporate transfer not found.' });
  let lineId: number | null = null;
  if (requestedLineId && Number.isInteger(requestedLineId)) {
    const [[line]] = await db.query<RowDataPacket[]>('SELECT id FROM app_corporate_transfer_lines WHERE id = ? AND transfer_id = ?', [requestedLineId, transferId]);
    if (line) lineId = Number(line.id);
  }
  const [products] = await db.query<RowDataPacket[]>(
    `SELECT id, name FROM app_corporate_products
      WHERE company_id = ? AND category_id = ? AND status = 'active' ORDER BY name`,
    [req.user!.companyId, categoryId],
  );
  const stock = [];
  for (const product of products) {
    let quantity = await availableStock(db, req.user!.companyId, Number(transfer.fromProjectId),
      transfer.fromSiteId ? Number(transfer.fromSiteId) : null, Number(product.id), lineId);
    if (String(transfer.status) !== 'posted') {
      quantity -= await reservedDraftQuantity(db, transferId, Number(product.id), lineId);
    }
    stock.push({ productId: Number(product.id), availableStock: Math.max(0, quantity) });
  }
  return res.json({ stock });
});

corporateTransfersRouter.get('/:id/lines', requirePermission('corporate_transfers.view'), async (req: AuthRequest, res) => {
  const transferId = Number(req.params.id);
  if (!(await accessibleTransfer(req.user!, transferId))) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const { page, pageSize, offset } = pagination(req.query);
  const search = String(req.query.search ?? '').trim(); const like = `%${search}%`;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ctl.id, ctl.category_id AS categoryId, c.name AS categoryName,
            ctl.product_id AS productId, COALESCE(p.name, c.name, 'Unspecified item') AS productName,
            ctl.unit_id AS unitId, u.name AS unitName, ctl.destination_site_id AS destinationSiteId,
            ps.name AS destinationSiteName, ctl.quantity, ctl.unit_price AS unitPrice,
            ctl.other_cost AS otherCost, ctl.other_expense AS otherExpense,
            ctl.total_amount AS totalAmount, ctl.notes, ctl.transfer_date AS transferDate
       FROM app_corporate_transfer_lines ctl
       LEFT JOIN app_corporate_categories c ON c.id = ctl.category_id
       LEFT JOIN app_corporate_products p ON p.id = ctl.product_id
       LEFT JOIN app_units u ON u.id = ctl.unit_id
       LEFT JOIN app_project_sites ps ON ps.id = ctl.destination_site_id
      WHERE ctl.transfer_id = ? AND (? = '' OR p.name LIKE ? OR c.name LIKE ? OR ps.name LIKE ? OR ctl.notes LIKE ?)
      ORDER BY ctl.id DESC LIMIT ? OFFSET ?`,
    [transferId, search, like, like, like, like, pageSize, offset],
  );
  const [[total]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM app_corporate_transfer_lines ctl
       LEFT JOIN app_corporate_categories c ON c.id = ctl.category_id
       LEFT JOIN app_corporate_products p ON p.id = ctl.product_id
       LEFT JOIN app_project_sites ps ON ps.id = ctl.destination_site_id
      WHERE ctl.transfer_id = ? AND (? = '' OR p.name LIKE ? OR c.name LIKE ? OR ps.name LIKE ? OR ctl.notes LIKE ?)`,
    [transferId, search, like, like, like, like],
  );
  return res.json({ items: rows, page, pageSize, total: Number(total?.count ?? 0) });
});

corporateTransfersRouter.post('/:id/lines', requirePermission('corporate_transfers.manage'), async (req: AuthRequest, res) => {
  const transferId = Number(req.params.id); const parsed = lineSchema.safeParse(req.body);
  if (!Number.isInteger(transferId) || !parsed.success) return res.status(400).json({ message: 'Check the product, quantity, and price.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const transfer = await accessibleTransfer(req.user!, transferId, connection);
    if (!transfer) { await connection.rollback(); return res.status(404).json({ message: 'Corporate transfer not found.' }); }
    const validation = await validateLine(connection, req.user!, Number(transfer.receiveProjectId), parsed.data);
    if (validation.error) { await connection.rollback(); return res.status(400).json({ message: validation.error }); }
    const stock = await validateStock(connection, req.user!, transfer, parsed.data);
    if (stock.error) { await connection.rollback(); return res.status(409).json({ message: stock.error, availableStock: stock.availableStock }); }
    const item = parsed.data;
    const totalAmount = item.quantity * item.unitPrice + (item.otherCost ?? 0) + (item.otherExpense ?? 0);
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_corporate_transfer_lines
       (transfer_id, category_id, product_id, unit_id, destination_site_id, quantity, unit_price,
        other_cost, other_expense, total_amount, notes, transfer_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transferId, validation.categoryId ?? null, item.productId, item.unitId ?? null,
        item.destinationSiteId ?? null, item.quantity, item.unitPrice, item.otherCost ?? 0,
        item.otherExpense ?? 0, totalAmount, emptyToNull(item.notes), emptyToNull(item.transferDate)],
    );
    await connection.commit();
    return res.status(201).json({ id: result.insertId, totalAmount, availableStock: stock.availableStock, message: 'Transfer product line added.' });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
});

corporateTransfersRouter.put('/:id/lines/:lineId', requirePermission('corporate_transfers.manage'), async (req: AuthRequest, res) => {
  const transferId = Number(req.params.id); const lineId = Number(req.params.lineId); const parsed = lineSchema.safeParse(req.body);
  if (!Number.isInteger(transferId) || !Number.isInteger(lineId) || !parsed.success) return res.status(400).json({ message: 'Check the transfer product line.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const transfer = await accessibleTransfer(req.user!, transferId, connection);
    if (!transfer) { await connection.rollback(); return res.status(404).json({ message: 'Corporate transfer not found.' }); }
    const validation = await validateLine(connection, req.user!, Number(transfer.receiveProjectId), parsed.data);
    if (validation.error) { await connection.rollback(); return res.status(400).json({ message: validation.error }); }
    const stock = await validateStock(connection, req.user!, transfer, parsed.data, lineId);
    if (stock.error) { await connection.rollback(); return res.status(409).json({ message: stock.error, availableStock: stock.availableStock }); }
    const item = parsed.data;
    const totalAmount = item.quantity * item.unitPrice + (item.otherCost ?? 0) + (item.otherExpense ?? 0);
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE app_corporate_transfer_lines SET category_id = ?, product_id = ?, unit_id = ?,
       destination_site_id = ?, quantity = ?, unit_price = ?, other_cost = ?, other_expense = ?,
       total_amount = ?, notes = ?, transfer_date = ? WHERE id = ? AND transfer_id = ?`,
      [validation.categoryId ?? null, item.productId, item.unitId ?? null, item.destinationSiteId ?? null,
        item.quantity, item.unitPrice, item.otherCost ?? 0, item.otherExpense ?? 0, totalAmount,
        emptyToNull(item.notes), emptyToNull(item.transferDate), lineId, transferId],
    );
    if (!result.affectedRows) { await connection.rollback(); return res.status(404).json({ message: 'Transfer product line not found.' }); }
    await connection.commit();
    return res.json({ id: lineId, totalAmount, availableStock: stock.availableStock, message: 'Transfer product line updated.' });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
});

corporateTransfersRouter.delete('/:id/lines/:lineId', requirePermission('corporate_transfers.manage'), async (req: AuthRequest, res) => {
  const transferId = Number(req.params.id); const lineId = Number(req.params.lineId);
  if (!(await accessibleTransfer(req.user!, transferId))) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const [result] = await db.query<ResultSetHeader>('DELETE FROM app_corporate_transfer_lines WHERE id = ? AND transfer_id = ?', [lineId, transferId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Transfer product line not found.' });
  return res.json({ message: 'Transfer product line deleted.' });
});

corporateTransfersRouter.get('/:id/delete-check', requirePermission('corporate_transfers.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!(await accessibleTransfer(req.user!, id))) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const [[row]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS productLines FROM app_corporate_transfer_lines WHERE transfer_id = ?', [id]);
  const productLines = Number(row?.productLines ?? 0);
  return res.json({ canDelete: productLines === 0, references: { productLines } });
});

corporateTransfersRouter.delete('/:id', requirePermission('corporate_transfers.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!(await accessibleTransfer(req.user!, id))) return res.status(404).json({ message: 'Corporate transfer not found.' });
  const [[count]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS productLines FROM app_corporate_transfer_lines WHERE transfer_id = ?', [id]);
  if (Number(count?.productLines ?? 0) > 0) return res.status(409).json({ message: 'Remove all product lines before deleting the transfer.' });
  const [[before]] = await db.query<RowDataPacket[]>('SELECT * FROM app_corporate_transfers WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  await db.query('DELETE FROM app_corporate_transfers WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  await audit(req, 'delete', id, before, null);
  return res.json({ message: 'Corporate transfer deleted.' });
});
