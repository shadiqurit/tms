import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const corporatePurchasesRouter = Router();
corporatePurchasesRouter.use(authenticate);

const optionalText = (length: number) => z.string().trim().max(length).optional().nullable();
const optionalDate = z.string().date().or(z.literal('')).optional().nullable();
const purchaseSchema = z.object({
  projectId: z.number().int().positive(),
  siteId: z.number().int().positive().optional().nullable(),
  supplierId: z.number().int().positive().optional().nullable(),
  purchaseNo: optionalText(100),
  localSupplier: optionalText(200),
  supplierAddress: optionalText(500),
  purchaseDate: z.string().date(),
  purchaseType: optionalText(50),
  challanNo: optionalText(120),
  challanDate: optionalDate,
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['draft', 'posted', 'cancelled']),
});
const lineSchema = z.object({
  categoryId: z.number().int().positive().optional().nullable(),
  subcategoryId: z.number().int().positive().optional().nullable(),
  productId: z.number().int().positive(),
  unitId: z.number().int().positive().optional().nullable(),
  siteId: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().optional().nullable(),
  notes: optionalText(500),
});

const emptyToNull = (value: string | null | undefined) => value?.trim() || null;

async function accessiblePurchase(user: NonNullable<AuthRequest['user']>, purchaseId: number, connection: Pool | PoolConnection = db) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT cp.id, cp.project_id AS projectId
       FROM app_corporate_purchases cp
       JOIN app_projects p ON p.id = cp.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE cp.id = ? AND cp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, purchaseId, user.companyId, user.roleKey],
  );
  return rows[0];
}

async function validateHeader(user: NonNullable<AuthRequest['user']>, item: z.infer<typeof purchaseSchema>) {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT p.id FROM app_projects p
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.id = ? AND p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      LIMIT 1`,
    [user.id, item.projectId, user.companyId, user.roleKey],
  );
  if (!projects[0]) return 'The selected project is invalid or not assigned to you.';
  if (item.siteId) {
    const [sites] = await db.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? LIMIT 1', [item.siteId, item.projectId]);
    if (!sites[0]) return 'The selected site does not belong to this project.';
  }
  if (item.supplierId) {
    const [suppliers] = await db.query<RowDataPacket[]>('SELECT id FROM app_suppliers WHERE id = ? AND company_id = ? AND status = \'active\' LIMIT 1', [item.supplierId, user.companyId]);
    if (!suppliers[0]) return 'The selected supplier is invalid.';
  }
  return null;
}

async function validateLine(
  connection: PoolConnection,
  user: NonNullable<AuthRequest['user']>,
  projectId: number,
  item: z.infer<typeof lineSchema>,
) {
  const [products] = await connection.query<RowDataPacket[]>(
    `SELECT id, category_id AS categoryId FROM app_corporate_products
      WHERE id = ? AND company_id = ? AND status = 'active' LIMIT 1`,
    [item.productId, user.companyId],
  );
  const product = products[0];
  if (!product) return { error: 'The selected corporate product is invalid.' };
  const categoryId = item.categoryId ?? (product.categoryId ? Number(product.categoryId) : null);
  if (item.categoryId && product.categoryId && Number(product.categoryId) !== item.categoryId) {
    return { error: 'The selected product does not belong to this category.' };
  }
  if (item.subcategoryId) {
    const [subcategories] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM app_corporate_subcategories WHERE id = ? AND company_id = ? AND category_id = ? AND status = \'active\' LIMIT 1',
      [item.subcategoryId, user.companyId, categoryId],
    );
    if (!subcategories[0]) return { error: 'The selected subcategory is invalid.' };
  }
  if (item.unitId) {
    const [units] = await connection.query<RowDataPacket[]>('SELECT id FROM app_units WHERE id = ? AND company_id = ? LIMIT 1', [item.unitId, user.companyId]);
    if (!units[0]) return { error: 'The selected unit is invalid.' };
  }
  if (item.siteId) {
    const [sites] = await connection.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE id = ? AND project_id = ? LIMIT 1', [item.siteId, projectId]);
    if (!sites[0]) return { error: 'The selected site does not belong to this project.' };
  }
  return { categoryId };
}

function pagination(query: AuthRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

corporatePurchasesRouter.get('/options', requirePermission('corporate_purchases.view'), async (req: AuthRequest, res) => {
  const [projects] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT p.id, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS code, p.name,
            p.tender_id AS tenderId, p.address AS location
       FROM app_projects p LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL) ORDER BY p.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [sites] = await db.query<RowDataPacket[]>(
    `SELECT s.id, s.project_id AS projectId, s.name, s.address
       FROM app_project_sites s JOIN app_projects p ON p.id = s.project_id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE p.company_id = ? AND s.status = 'active' AND (? = 'programmer' OR up.user_id IS NOT NULL)
      ORDER BY s.name`, [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  const [suppliers] = await db.query<RowDataPacket[]>('SELECT id, code, name, address, phone FROM app_suppliers WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [categories] = await db.query<RowDataPacket[]>('SELECT id, name FROM app_corporate_categories WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [subcategories] = await db.query<RowDataPacket[]>('SELECT id, category_id AS categoryId, name FROM app_corporate_subcategories WHERE company_id = ? AND status = \'active\' ORDER BY name', [req.user!.companyId]);
  const [products] = await db.query<RowDataPacket[]>(
    `SELECT cp.id, cp.category_id AS categoryId, cp.unit_id AS unitId, cp.name,
            cp.description, cp.default_price AS defaultPrice, u.name AS unitName
       FROM app_corporate_products cp LEFT JOIN app_units u ON u.id = cp.unit_id
      WHERE cp.company_id = ? AND cp.status = 'active' ORDER BY cp.name`, [req.user!.companyId],
  );
  const [units] = await db.query<RowDataPacket[]>('SELECT id, name, code FROM app_units WHERE company_id = ? ORDER BY name', [req.user!.companyId]);
  return res.json({ projects, sites, suppliers, categories, subcategories, products, units });
});

corporatePurchasesRouter.get('/', requirePermission('corporate_purchases.view'), async (req: AuthRequest, res) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT cp.id, cp.project_id AS projectId, COALESCE(p.package_no, p.code, CONCAT('#', p.id)) AS projectCode,
            p.name AS projectName, cp.site_id AS siteId, ps.name AS siteName, cp.supplier_id AS supplierId,
            COALESCE(s.name, cp.local_supplier, 'Unspecified supplier') AS supplierName,
            cp.purchase_no AS purchaseNo, cp.purchase_date AS purchaseDate, cp.challan_no AS challanNo,
            cp.status, COUNT(cpl.id) AS itemCount, COALESCE(SUM(cpl.quantity), 0) AS totalQuantity,
            COALESCE(SUM(cpl.total_amount), 0) AS totalAmount
       FROM app_corporate_purchases cp
       JOIN app_projects p ON p.id = cp.project_id
       LEFT JOIN app_project_sites ps ON ps.id = cp.site_id
       LEFT JOIN app_suppliers s ON s.id = cp.supplier_id
       LEFT JOIN app_corporate_purchase_lines cpl ON cpl.purchase_id = cp.id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE cp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      GROUP BY cp.id, p.id, ps.id, s.id
      ORDER BY cp.purchase_date DESC, cp.id DESC`,
    [req.user!.id, req.user!.companyId, req.user!.roleKey],
  );
  return res.json({ purchases: rows });
});

corporatePurchasesRouter.post('/', requirePermission('corporate_purchases.manage'), async (req: AuthRequest, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the project, purchase date, and supplier information.' });
  const relationError = await validateHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  const item = parsed.data;
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO app_corporate_purchases
       (company_id, project_id, site_id, supplier_id, purchase_no, local_supplier, supplier_address,
        purchase_date, purchase_type, challan_no, challan_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, item.projectId, item.siteId ?? null, item.supplierId ?? null,
      emptyToNull(item.purchaseNo), emptyToNull(item.localSupplier), emptyToNull(item.supplierAddress),
      item.purchaseDate, emptyToNull(item.purchaseType) ?? 'corporate', emptyToNull(item.challanNo),
      emptyToNull(item.challanDate), emptyToNull(item.notes), item.status],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'create', 'corporate_purchase', ?, ?)`,
    [req.user!.companyId, req.user!.id, String(result.insertId), JSON.stringify(item)],
  );
  return res.status(201).json({ id: result.insertId, message: 'Corporate purchase created. You can now add product lines.' });
});

corporatePurchasesRouter.get('/:id', requirePermission('corporate_purchases.view'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid corporate purchase.' });
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT cp.id, cp.project_id AS projectId, cp.site_id AS siteId, cp.supplier_id AS supplierId,
            cp.purchase_no AS purchaseNo, cp.local_supplier AS localSupplier,
            cp.supplier_address AS supplierAddress, cp.purchase_date AS purchaseDate,
            cp.purchase_type AS purchaseType, cp.challan_no AS challanNo,
            cp.challan_date AS challanDate, cp.notes, cp.status,
            COUNT(cpl.id) AS itemCount, COALESCE(SUM(cpl.total_amount), 0) AS totalAmount
       FROM app_corporate_purchases cp
       JOIN app_projects p ON p.id = cp.project_id
       LEFT JOIN app_corporate_purchase_lines cpl ON cpl.purchase_id = cp.id
       LEFT JOIN app_user_projects up ON up.project_id = p.id AND up.user_id = ?
      WHERE cp.id = ? AND cp.company_id = ? AND (? = 'programmer' OR up.user_id IS NOT NULL)
      GROUP BY cp.id LIMIT 1`,
    [req.user!.id, id, req.user!.companyId, req.user!.roleKey],
  );
  if (!rows[0]) return res.status(404).json({ message: 'Corporate purchase not found.' });
  return res.json({ purchase: rows[0] });
});

corporatePurchasesRouter.put('/:id', requirePermission('corporate_purchases.manage'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const parsed = purchaseSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ message: 'Check the corporate purchase information.' });
  const accessible = await accessiblePurchase(req.user!, id);
  if (!accessible) return res.status(404).json({ message: 'Corporate purchase not found.' });
  const relationError = await validateHeader(req.user!, parsed.data);
  if (relationError) return res.status(400).json({ message: relationError });
  if (Number(accessible.projectId) !== parsed.data.projectId) {
    const [[count]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS lines FROM app_corporate_purchase_lines WHERE purchase_id = ?', [id]);
    if (Number(count?.lines ?? 0) > 0) return res.status(409).json({ message: 'Remove product lines before changing the project.' });
  }
  const [[before]] = await db.query<RowDataPacket[]>('SELECT * FROM app_corporate_purchases WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
  const item = parsed.data;
  await db.query(
    `UPDATE app_corporate_purchases SET project_id = ?, site_id = ?, supplier_id = ?, purchase_no = ?,
       local_supplier = ?, supplier_address = ?, purchase_date = ?, purchase_type = ?, challan_no = ?,
       challan_date = ?, notes = ?, status = ? WHERE id = ? AND company_id = ?`,
    [item.projectId, item.siteId ?? null, item.supplierId ?? null, emptyToNull(item.purchaseNo),
      emptyToNull(item.localSupplier), emptyToNull(item.supplierAddress), item.purchaseDate,
      emptyToNull(item.purchaseType) ?? 'corporate', emptyToNull(item.challanNo), emptyToNull(item.challanDate),
      emptyToNull(item.notes), item.status, id, req.user!.companyId],
  );
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, 'update', 'corporate_purchase', ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, String(id), JSON.stringify(before), JSON.stringify(item)],
  );
  return res.json({ id, message: 'Corporate purchase updated.' });
});

corporatePurchasesRouter.get('/:id/lines', requirePermission('corporate_purchases.view'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  if (!(await accessiblePurchase(req.user!, purchaseId))) return res.status(404).json({ message: 'Corporate purchase not found.' });
  const { page, pageSize, offset } = pagination(req.query);
  const search = String(req.query.search ?? '').trim();
  const like = `%${search}%`;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT cpl.id, cpl.category_id AS categoryId, c.name AS categoryName,
            cpl.subcategory_id AS subcategoryId, sc.name AS subcategoryName,
            cpl.product_id AS productId, COALESCE(pr.name, c.name, 'Unspecified item') AS productName,
            cpl.unit_id AS unitId, u.name AS unitName, cpl.site_id AS siteId, ps.name AS siteName,
            cpl.quantity, cpl.unit_price AS unitPrice, cpl.discount, cpl.total_amount AS totalAmount, cpl.notes
       FROM app_corporate_purchase_lines cpl
       LEFT JOIN app_corporate_categories c ON c.id = cpl.category_id
       LEFT JOIN app_corporate_subcategories sc ON sc.id = cpl.subcategory_id
       LEFT JOIN app_corporate_products pr ON pr.id = cpl.product_id
       LEFT JOIN app_units u ON u.id = cpl.unit_id
       LEFT JOIN app_project_sites ps ON ps.id = cpl.site_id
      WHERE cpl.purchase_id = ? AND (? = '' OR pr.name LIKE ? OR c.name LIKE ? OR ps.name LIKE ? OR cpl.notes LIKE ?)
      ORDER BY cpl.id DESC LIMIT ? OFFSET ?`,
    [purchaseId, search, like, like, like, like, pageSize, offset],
  );
  const [[total]] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM app_corporate_purchase_lines cpl
       LEFT JOIN app_corporate_categories c ON c.id = cpl.category_id
       LEFT JOIN app_corporate_products pr ON pr.id = cpl.product_id
       LEFT JOIN app_project_sites ps ON ps.id = cpl.site_id
      WHERE cpl.purchase_id = ? AND (? = '' OR pr.name LIKE ? OR c.name LIKE ? OR ps.name LIKE ? OR cpl.notes LIKE ?)`,
    [purchaseId, search, like, like, like, like],
  );
  return res.json({ items: rows, page, pageSize, total: Number(total?.count ?? 0) });
});

corporatePurchasesRouter.post('/:id/lines', requirePermission('corporate_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const parsed = lineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !parsed.success) return res.status(400).json({ message: 'Check the product, quantity, and price.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Corporate purchase not found.' });
    const validation = await validateLine(connection, req.user!, Number(purchase.projectId), parsed.data);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const item = parsed.data;
    const totalAmount = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0));
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO app_corporate_purchase_lines
         (purchase_id, category_id, subcategory_id, product_id, unit_id, site_id,
          quantity, unit_price, discount, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchaseId, validation.categoryId ?? null, item.subcategoryId ?? null, item.productId,
        item.unitId ?? null, item.siteId ?? null, item.quantity, item.unitPrice,
        item.discount ?? 0, totalAmount, emptyToNull(item.notes)],
    );
    return res.status(201).json({ id: result.insertId, totalAmount, message: 'Corporate product line added.' });
  } finally {
    connection.release();
  }
});

corporatePurchasesRouter.put('/:id/lines/:lineId', requirePermission('corporate_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  const parsed = lineSchema.safeParse(req.body);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId) || !parsed.success) return res.status(400).json({ message: 'Check the product line.' });
  const connection = await db.getConnection();
  try {
    const purchase = await accessiblePurchase(req.user!, purchaseId, connection);
    if (!purchase) return res.status(404).json({ message: 'Corporate purchase not found.' });
    const validation = await validateLine(connection, req.user!, Number(purchase.projectId), parsed.data);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const item = parsed.data;
    const totalAmount = Math.max(0, item.quantity * item.unitPrice - (item.discount ?? 0));
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE app_corporate_purchase_lines SET category_id = ?, subcategory_id = ?, product_id = ?,
         unit_id = ?, site_id = ?, quantity = ?, unit_price = ?, discount = ?, total_amount = ?, notes = ?
       WHERE id = ? AND purchase_id = ?`,
      [validation.categoryId ?? null, item.subcategoryId ?? null, item.productId, item.unitId ?? null,
        item.siteId ?? null, item.quantity, item.unitPrice, item.discount ?? 0, totalAmount,
        emptyToNull(item.notes), lineId, purchaseId],
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Corporate product line not found.' });
    return res.json({ id: lineId, totalAmount, message: 'Corporate product line updated.' });
  } finally {
    connection.release();
  }
});

corporatePurchasesRouter.delete('/:id/lines/:lineId', requirePermission('corporate_purchases.manage'), async (req: AuthRequest, res) => {
  const purchaseId = Number(req.params.id);
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(purchaseId) || !Number.isInteger(lineId)) return res.status(400).json({ message: 'Invalid product line.' });
  if (!(await accessiblePurchase(req.user!, purchaseId))) return res.status(404).json({ message: 'Corporate purchase not found.' });
  const [result] = await db.query<ResultSetHeader>('DELETE FROM app_corporate_purchase_lines WHERE id = ? AND purchase_id = ?', [lineId, purchaseId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Corporate product line not found.' });
  return res.status(204).send();
});

corporatePurchasesRouter.get('/:id/delete-check', requirePermission('corporate_purchases.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await accessiblePurchase(req.user!, id))) return res.status(404).json({ message: 'Corporate purchase not found.' });
  const [[count]] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS lines FROM app_corporate_purchase_lines WHERE purchase_id = ?', [id]);
  const productLines = Number(count?.lines ?? 0);
  return res.json({ canDelete: productLines === 0, references: { productLines } });
});

corporatePurchasesRouter.delete('/:id', requirePermission('corporate_purchases.delete'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await accessiblePurchase(req.user!, id))) return res.status(404).json({ message: 'Corporate purchase not found.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[purchase]] = await connection.query<RowDataPacket[]>('SELECT * FROM app_corporate_purchases WHERE id = ? AND company_id = ? FOR UPDATE', [id, req.user!.companyId]);
    if (!purchase) {
      await connection.rollback();
      return res.status(404).json({ message: 'Corporate purchase not found.' });
    }
    const [[count]] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS lines FROM app_corporate_purchase_lines WHERE purchase_id = ?', [id]);
    if (Number(count?.lines ?? 0) > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Remove all product lines before deleting this corporate purchase.' });
    }
    await connection.query(
      `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json)
       VALUES (?, ?, 'delete', 'corporate_purchase', ?, ?)`,
      [req.user!.companyId, req.user!.id, String(id), JSON.stringify(purchase)],
    );
    await connection.query('DELETE FROM app_corporate_purchases WHERE id = ? AND company_id = ?', [id, req.user!.companyId]);
    await connection.commit();
    return res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
