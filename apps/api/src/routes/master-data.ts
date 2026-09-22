import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const masterDataRouter = Router();
masterDataRouter.use(authenticate);

const statusSchema = z.enum(['active', 'inactive']);
const supplierTypeSchema = z.enum(['L', 'C', 'I', 'O']);
const optionalText = (length: number) => z.string().trim().max(length).optional().nullable();
const supplierSchema = z.object({
  code: optionalText(120), name: z.string().trim().min(1).max(200), address: optionalText(500),
  contactPerson: optionalText(120), phone: optionalText(50), email: z.string().trim().email().max(120).or(z.literal('')).optional().nullable(),
  supplierType: supplierTypeSchema, status: statusSchema,
});
const unitSchema = z.object({ name: z.string().trim().min(1).max(80), code: optionalText(30), description: optionalText(160), status: statusSchema });
const materialSchema = z.object({ unitId: z.number().int().positive().optional().nullable(), name: z.string().trim().min(1).max(200), details: optionalText(300), materialType: optionalText(80), status: statusSchema });
const categorySchema = z.object({ name: z.string().trim().min(1).max(180), status: statusSchema });
const productSchema = z.object({
  categoryId: z.number().int().positive().optional().nullable(),
  unitId: z.number().int().positive().optional().nullable(), name: z.string().trim().min(1).max(220),
  description: optionalText(500), defaultPrice: z.number().nonnegative().optional().nullable(), status: statusSchema,
});

const masterKinds = ['suppliers', 'units', 'materials', 'categories', 'products'] as const;
type MasterKind = typeof masterKinds[number];
type MasterPayload = Record<string, unknown>;

const schemas: Record<MasterKind, z.ZodTypeAny> = {
  suppliers: supplierSchema, units: unitSchema, materials: materialSchema,
  categories: categorySchema, products: productSchema,
};
const tables: Record<MasterKind, string> = {
  suppliers: 'app_suppliers', units: 'app_units', materials: 'app_materials', categories: 'app_corporate_categories',
  products: 'app_corporate_products',
};

function kindFrom(value: string): MasterKind | null {
  return masterKinds.includes(value as MasterKind) ? value as MasterKind : null;
}
const emptyToNull = (value: unknown) => typeof value === 'string' ? value.trim() || null : value ?? null;

async function getRecord(kind: MasterKind, id: number, companyId: number) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM ${tables[kind]} WHERE id = ? AND company_id = ? LIMIT 1`, [id, companyId]);
  return rows[0];
}

async function duplicateName(kind: MasterKind, item: MasterPayload, companyId: number, excludeId?: number) {
  let sql = `SELECT id FROM ${tables[kind]} WHERE company_id = ? AND LOWER(name) = LOWER(?)`;
  const values: unknown[] = [companyId, item.name];
  if (kind === 'products') {
    sql += ' AND (category_id <=> ?)';
    values.push(item.categoryId ?? null);
  }
  if (excludeId) { sql += ' AND id <> ?'; values.push(excludeId); }
  sql += ' LIMIT 1';
  const [rows] = await db.query<RowDataPacket[]>(sql, values);
  return Boolean(rows[0]);
}

async function validateRelations(kind: MasterKind, item: MasterPayload, companyId: number) {
  if ((kind === 'materials' || kind === 'products') && item.unitId) {
    const [units] = await db.query<RowDataPacket[]>('SELECT id FROM app_units WHERE id = ? AND company_id = ? LIMIT 1', [item.unitId, companyId]);
    if (!units[0]) return 'The selected UOM is invalid.';
  }
  if (kind === 'products' && item.categoryId) {
    const [categories] = await db.query<RowDataPacket[]>('SELECT id FROM app_corporate_categories WHERE id = ? AND company_id = ? LIMIT 1', [item.categoryId, companyId]);
    if (!categories[0]) return 'The selected product category is invalid.';
  }
  return null;
}

async function insertRecord(kind: MasterKind, item: MasterPayload, companyId: number) {
  let sql = ''; let values: unknown[] = [];
  switch (kind) {
    case 'suppliers':
      sql = `INSERT INTO app_suppliers (company_id, code, name, address, contact_person, phone, email, supplier_type, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      values = [companyId, emptyToNull(item.code), item.name, emptyToNull(item.address), emptyToNull(item.contactPerson), emptyToNull(item.phone), emptyToNull(item.email), emptyToNull(item.supplierType), item.status];
      break;
    case 'units':
      sql = 'INSERT INTO app_units (company_id, name, code, description, status) VALUES (?, ?, ?, ?, ?)';
      values = [companyId, item.name, emptyToNull(item.code), emptyToNull(item.description), item.status];
      break;
    case 'materials':
      sql = 'INSERT INTO app_materials (company_id, unit_id, name, details, material_type, status) VALUES (?, ?, ?, ?, ?, ?)';
      values = [companyId, item.unitId ?? null, item.name, emptyToNull(item.details), emptyToNull(item.materialType), item.status];
      break;
    case 'categories':
      sql = 'INSERT INTO app_corporate_categories (company_id, name, status) VALUES (?, ?, ?)';
      values = [companyId, item.name, item.status];
      break;
    case 'products':
      sql = `INSERT INTO app_corporate_products (company_id, category_id, unit_id, name, description, default_price, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`;
      values = [companyId, item.categoryId ?? null, item.unitId ?? null, item.name, emptyToNull(item.description), item.defaultPrice ?? null, item.status];
      break;
  }
  const [result] = await db.query<ResultSetHeader>(sql, values);
  return result.insertId;
}

async function updateRecord(kind: MasterKind, id: number, item: MasterPayload, companyId: number) {
  let sql = ''; let values: unknown[] = [];
  switch (kind) {
    case 'suppliers':
      sql = `UPDATE app_suppliers SET code = ?, name = ?, address = ?, contact_person = ?, phone = ?, email = ?, supplier_type = ?, status = ?
              WHERE id = ? AND company_id = ?`;
      values = [emptyToNull(item.code), item.name, emptyToNull(item.address), emptyToNull(item.contactPerson), emptyToNull(item.phone), emptyToNull(item.email), emptyToNull(item.supplierType), item.status, id, companyId];
      break;
    case 'units':
      sql = 'UPDATE app_units SET name = ?, code = ?, description = ?, status = ? WHERE id = ? AND company_id = ?';
      values = [item.name, emptyToNull(item.code), emptyToNull(item.description), item.status, id, companyId];
      break;
    case 'materials':
      sql = 'UPDATE app_materials SET unit_id = ?, name = ?, details = ?, material_type = ?, status = ? WHERE id = ? AND company_id = ?';
      values = [item.unitId ?? null, item.name, emptyToNull(item.details), emptyToNull(item.materialType), item.status, id, companyId];
      break;
    case 'categories':
      sql = 'UPDATE app_corporate_categories SET name = ?, status = ? WHERE id = ? AND company_id = ?';
      values = [item.name, item.status, id, companyId];
      break;
    case 'products':
      sql = `UPDATE app_corporate_products SET category_id = ?, unit_id = ?, name = ?, description = ?, default_price = ?, status = ?
              WHERE id = ? AND company_id = ?`;
      values = [item.categoryId ?? null, item.unitId ?? null, item.name, emptyToNull(item.description), item.defaultPrice ?? null, item.status, id, companyId];
      break;
  }
  const [result] = await db.query<ResultSetHeader>(sql, values);
  return result.affectedRows;
}

async function referenceCounts(kind: MasterKind, id: number) {
  const queries: Record<MasterKind, string> = {
    suppliers: `SELECT
      (SELECT COUNT(*) FROM app_site_purchases WHERE supplier_id = ?) AS sitePurchases,
      (SELECT COUNT(*) FROM app_corporate_purchases WHERE supplier_id = ?) AS corporatePurchases`,
    units: `SELECT
      (SELECT COUNT(*) FROM app_materials WHERE unit_id = ?) AS materials,
      (SELECT COUNT(*) FROM app_site_purchase_materials WHERE unit_id = ?) AS sitePurchaseLines,
      (SELECT COUNT(*) FROM app_corporate_products WHERE unit_id = ?) AS products,
      (SELECT COUNT(*) FROM app_corporate_purchase_lines WHERE unit_id = ?) AS corporatePurchaseLines`,
    materials: 'SELECT (SELECT COUNT(*) FROM app_site_purchase_materials WHERE material_id = ?) AS sitePurchaseLines',
    categories: `SELECT
      (SELECT COUNT(*) FROM app_corporate_subcategories WHERE category_id = ?) AS subcategories,
      (SELECT COUNT(*) FROM app_corporate_products WHERE category_id = ?) AS products,
      (SELECT COUNT(*) FROM app_corporate_purchase_lines WHERE category_id = ?) AS corporatePurchaseLines`,
    products: 'SELECT (SELECT COUNT(*) FROM app_corporate_purchase_lines WHERE product_id = ?) AS corporatePurchaseLines',
  };
  const placeholderCount = (queries[kind].match(/\?/g) ?? []).length;
  const [[row]] = await db.query<RowDataPacket[]>(queries[kind], Array(placeholderCount).fill(id));
  const references = Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Number(value ?? 0)]));
  return { references, total: Object.values(references).reduce((sum, value) => sum + value, 0) };
}

async function audit(req: AuthRequest, action: string, kind: MasterKind, id: number, before: unknown, after: unknown) {
  await db.query(
    `INSERT INTO app_audit_logs (company_id, user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user!.companyId, req.user!.id, action, `master_${kind}`, id, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
  );
}

masterDataRouter.get('/', requirePermission('master_data.view'), async (req: AuthRequest, res) => {
  const companyId = req.user!.companyId;
  const [suppliers, units, materials, categories, products] = await Promise.all([
    db.query<RowDataPacket[]>(`SELECT s.id, s.code, s.name, s.address, s.contact_person AS contactPerson, s.phone, s.email,
      s.supplier_type AS supplierType, s.status,
      ((SELECT COUNT(*) FROM app_site_purchases sp WHERE sp.supplier_id = s.id) +
       (SELECT COUNT(*) FROM app_corporate_purchases cp WHERE cp.supplier_id = s.id)) AS usageCount
      FROM app_suppliers s WHERE s.company_id = ? ORDER BY s.name`, [companyId]),
    db.query<RowDataPacket[]>(`SELECT u.id, u.name, u.code, u.description, u.status,
      ((SELECT COUNT(*) FROM app_materials m WHERE m.unit_id = u.id) +
       (SELECT COUNT(*) FROM app_site_purchase_materials sm WHERE sm.unit_id = u.id) +
       (SELECT COUNT(*) FROM app_corporate_products p WHERE p.unit_id = u.id) +
       (SELECT COUNT(*) FROM app_corporate_purchase_lines cl WHERE cl.unit_id = u.id)) AS usageCount
      FROM app_units u WHERE u.company_id = ? ORDER BY u.name`, [companyId]),
    db.query<RowDataPacket[]>(`SELECT m.id, m.name, m.unit_id AS unitId, u.name AS unitName, m.details,
      m.material_type AS materialType, m.status,
      (SELECT COUNT(*) FROM app_site_purchase_materials sm WHERE sm.material_id = m.id) AS usageCount
      FROM app_materials m LEFT JOIN app_units u ON u.id = m.unit_id WHERE m.company_id = ? ORDER BY m.name`, [companyId]),
    db.query<RowDataPacket[]>(`SELECT c.id, c.name, c.status,
      ((SELECT COUNT(*) FROM app_corporate_subcategories sc WHERE sc.category_id = c.id) +
       (SELECT COUNT(*) FROM app_corporate_products p WHERE p.category_id = c.id) +
       (SELECT COUNT(*) FROM app_corporate_purchase_lines cl WHERE cl.category_id = c.id)) AS usageCount
      FROM app_corporate_categories c WHERE c.company_id = ? ORDER BY c.name`, [companyId]),
    db.query<RowDataPacket[]>(`SELECT p.id, p.category_id AS categoryId, c.name AS categoryName,
      p.unit_id AS unitId, u.name AS unitName,
      p.name, p.description, p.default_price AS defaultPrice, p.status,
      (SELECT COUNT(*) FROM app_corporate_purchase_lines cl WHERE cl.product_id = p.id) AS usageCount
      FROM app_corporate_products p
      LEFT JOIN app_corporate_categories c ON c.id = p.category_id
      LEFT JOIN app_units u ON u.id = p.unit_id
      WHERE p.company_id = ? ORDER BY p.name`, [companyId]),
  ]);
  return res.json({ suppliers: suppliers[0], units: units[0], materials: materials[0], categories: categories[0], products: products[0] });
});

masterDataRouter.post('/:kind', requirePermission('master_data.manage'), async (req: AuthRequest, res) => {
  const kind = kindFrom(String(req.params.kind ?? ''));
  if (!kind) return res.status(404).json({ message: 'Unknown master-data type.' });
  const parsed = schemas[kind].safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the required fields and value lengths.' });
  const item = parsed.data as MasterPayload;
  if (await duplicateName(kind, item, req.user!.companyId)) return res.status(409).json({ message: 'A record with this name already exists.' });
  const relationError = await validateRelations(kind, item, req.user!.companyId);
  if (relationError) return res.status(400).json({ message: relationError });
  const id = await insertRecord(kind, item, req.user!.companyId);
  await audit(req, 'create', kind, id, null, item);
  return res.status(201).json({ id, message: 'Master record created.' });
});

masterDataRouter.put('/:kind/:id', requirePermission('master_data.manage'), async (req: AuthRequest, res) => {
  const kind = kindFrom(String(req.params.kind ?? '')); const id = Number(req.params.id);
  if (!kind || !Number.isInteger(id)) return res.status(400).json({ message: 'Invalid master record.' });
  const parsed = schemas[kind].safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the required fields and value lengths.' });
  const before = await getRecord(kind, id, req.user!.companyId);
  if (!before) return res.status(404).json({ message: 'Master record not found.' });
  const item = parsed.data as MasterPayload;
  if (await duplicateName(kind, item, req.user!.companyId, id)) return res.status(409).json({ message: 'A record with this name already exists.' });
  const relationError = await validateRelations(kind, item, req.user!.companyId);
  if (relationError) return res.status(400).json({ message: relationError });
  await updateRecord(kind, id, item, req.user!.companyId);
  await audit(req, 'update', kind, id, before, item);
  return res.json({ id, message: 'Master record updated.' });
});

masterDataRouter.get('/:kind/:id/delete-check', requirePermission('master_data.delete'), async (req: AuthRequest, res) => {
  const kind = kindFrom(String(req.params.kind ?? '')); const id = Number(req.params.id);
  if (!kind || !Number.isInteger(id)) return res.status(400).json({ message: 'Invalid master record.' });
  if (!await getRecord(kind, id, req.user!.companyId)) return res.status(404).json({ message: 'Master record not found.' });
  const usage = await referenceCounts(kind, id);
  return res.json({ canDelete: usage.total === 0, references: usage.references, totalReferences: usage.total });
});

masterDataRouter.delete('/:kind/:id', requirePermission('master_data.delete'), async (req: AuthRequest, res) => {
  const kind = kindFrom(String(req.params.kind ?? '')); const id = Number(req.params.id);
  if (!kind || !Number.isInteger(id)) return res.status(400).json({ message: 'Invalid master record.' });
  const before = await getRecord(kind, id, req.user!.companyId);
  if (!before) return res.status(404).json({ message: 'Master record not found.' });
  const usage = await referenceCounts(kind, id);
  if (usage.total) return res.status(409).json({ message: `This record is used by ${usage.total} other entries and cannot be deleted.` });
  try {
    const [result] = await db.query<ResultSetHeader>(`DELETE FROM ${tables[kind]} WHERE id = ? AND company_id = ?`, [id, req.user!.companyId]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Master record not found.' });
    await audit(req, 'delete', kind, id, before, null);
    return res.status(204).send();
  } catch (error) {
    const mysqlError = error as { code?: string };
    if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'This master record is already in use and cannot be deleted.' });
    }
    throw error;
  }
});
