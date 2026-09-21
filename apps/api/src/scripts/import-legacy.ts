import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../db.js';
import { parseLegacyJson } from './legacy-json.js';

type LegacyRow = Record<string, string | number | null>;
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../../Data');

async function records(file: string): Promise<LegacyRow[]> {
  const contents = await fs.readFile(path.join(dataDir, file), 'utf8');
  const raw = parseLegacyJson<{ recordset: LegacyRow[] }>(contents);
  return raw.recordset;
}

function roleKey(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function slug(name: string) {
  return name.trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

const routeByPage: Record<string, string> = {
  '1': '/dashboard', '2': '/projects', '9': '/expenses/setup', '12': '/suppliers', '14': '/workforce/employees',
  '15': '/expenses/pre-award', '24': '/purchases/site-engineer', '25': '/projects/sites',
  '26': '/expenses/setup', '50': '/finance/providers', '55': '/inventory/catalogue',
  '56': '/purchases/corporate', '63': '/billing', '80': '/admin/banks',
  '99': '/admin/menus', '992': '/admin/access', '902': '/reports/engineers',
  '903': '/reports/loans', '904': '/reports/mason-payments', '905': '/reports/corporate',
  '906': '/reports/final', '67': '/reports/summary',
};

async function upsertId(table: string, legacyId: number, sql: string, values: unknown[]) {
  await db.query(sql, values);
  const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE legacy_id = ? LIMIT 1`, [legacyId]);
  return Number(rows[0]!.id);
}

async function main() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const companies = await records('COMPANY.json');
    const company = companies.find((item) => Number(item.ID) === 1) ?? companies[0];
    if (!company) throw new Error('No company found in COMPANY.json');
    await connection.query(
      `INSERT INTO app_companies (legacy_id, code, name, address, email, phone)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE code=VALUES(code), name=VALUES(name), address=VALUES(address), email=VALUES(email), phone=VALUES(phone)`,
      [company.ID, company.CODE ?? 'TMS', company.CNAME, company.ADDRESS, company.EMAIL, company.PHONE],
    );
    const [[companyRow]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_companies WHERE legacy_id = ?', [company.ID]);
    const companyId = Number(companyRow!.id);

    const roleMap = new Map<number, number>();
    for (const row of await records('USER_GROUP.json')) {
      const key = roleKey(String(row.GROUP_NAME));
      const description = key === 'programmer'
        ? 'Super administrator with unrestricted create, update, delete, and configuration access'
        : `Imported from Oracle USER_GROUP ${row.ID}`;
      await connection.query(
        `INSERT INTO app_roles (legacy_id, role_key, name, description) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role_key=VALUES(role_key), name=VALUES(name), description=VALUES(description)`,
        [row.ID, key, row.GROUP_NAME, description],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_roles WHERE legacy_id = ?', [row.ID]);
      roleMap.set(Number(row.ID), Number(saved!.id));
    }

    const userMap = new Map<number, number>();
    for (const row of await records('APPUSER.json')) {
      const hash = await bcrypt.hash(String(row.PASS), 12);
      const roleId = roleMap.get(Number(row.USER_GROUP));
      if (!roleId) continue;
      await connection.query(
        `INSERT INTO app_users (legacy_id, company_id, role_id, username, first_name, last_name, email, password_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role_id=VALUES(role_id), first_name=VALUES(first_name), last_name=VALUES(last_name),
           email=VALUES(email), password_hash=VALUES(password_hash), status=VALUES(status)`,
        [row.ID, companyId, roleId, row.USERNAME, row.FIRSTNAME, row.LASTNAME, row.EMAIL, hash, row.STATUS === 'A' ? 'active' : 'inactive'],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_users WHERE legacy_id = ?', [row.ID]);
      userMap.set(Number(row.ID), Number(saved!.id));
    }

    const menus = await records('T_MENU.json');
    const permissionMap = new Map<number, number>();
    for (const menu of menus.filter((item) => item.PARENT_PID !== null)) {
      const key = `menu.${slug(String(menu.MENU_NAME))}.view`;
      const module = String(menus.find((item) => Number(item.PID) === Number(menu.PARENT_PID))?.MENU_NAME ?? 'General');
      await connection.query(
        `INSERT INTO app_permissions (permission_key, name, module) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module)`,
        [key, `View ${menu.MENU_NAME}`, module],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_permissions WHERE permission_key = ?', [key]);
      permissionMap.set(Number(menu.PID), Number(saved!.id));
    }
    const systemPermissions = [
      ['admin.access.manage', 'Manage access', 'System Administration'],
      ['projects.view', 'View projects', 'Projects'],
      ['projects.manage', 'Manage projects', 'Projects'],
      ['projects.delete', 'Delete unreferenced projects', 'Projects'],
      ['project_sites.view', 'View project sites', 'Projects'],
      ['project_sites.manage', 'Create and modify project sites', 'Projects'],
      ['project_sites.delete', 'Delete unreferenced project sites', 'Projects'],
      ['employees.view', 'View employees', 'Workforce'],
      ['employees.manage', 'Create and modify employees', 'Workforce'],
      ['employees.delete', 'Delete unreferenced employees', 'Workforce'],
      ['assignments.view', 'View employee assignments', 'Projects'],
      ['assignments.manage', 'Manage employee assignments', 'Projects'],
      ['expenses.view', 'View expenses', 'Expenses'],
      ['expenses.manage', 'Manage expenses', 'Expenses'],
      ['expenses.delete', 'Delete expenses', 'Expenses'],
      ['expense_setup.view', 'View expense setup', 'Expenses'],
      ['expense_setup.manage', 'Manage expense setup', 'Expenses'],
      ['expense_setup.delete', 'Delete unreferenced expense setup', 'Expenses'],
      ['site_purchases.view', 'View site engineer purchases', 'Procurement'],
      ['site_purchases.manage', 'Create and modify site engineer purchases', 'Procurement'],
      ['site_purchases.delete', 'Delete site engineer purchases', 'Procurement'],
      ['corporate_purchases.view', 'View corporate purchases', 'Procurement'],
      ['corporate_purchases.manage', 'Create and modify corporate purchases', 'Procurement'],
      ['corporate_purchases.delete', 'Delete corporate purchases', 'Procurement'],
    ];
    for (const permission of systemPermissions) {
      await connection.query(
        `INSERT INTO app_permissions (permission_key, name, module) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), module=VALUES(module)`, permission,
      );
    }

    const menuMap = new Map<number, number>();
    for (const menu of [...menus].sort((a, b) => Number(a.PARENT_PID !== null) - Number(b.PARENT_PID !== null))) {
      const legacyId = Number(menu.PID);
      await connection.query(
        `INSERT INTO app_menu_items (legacy_id, label, label_bn, route, icon, sort_order, active, permission_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label=VALUES(label), label_bn=VALUES(label_bn), route=VALUES(route),
           icon=VALUES(icon), sort_order=VALUES(sort_order), active=VALUES(active), permission_id=VALUES(permission_id)`,
        [legacyId, menu.MENU_NAME, menu.MENU_NAME_BANGLA, routeByPage[String(menu.MENU_LINK)] ?? `/legacy/page-${menu.MENU_LINK || legacyId}`,
          menu.ICON_IMG, menu.SORT_BY ?? 0, String(menu.STATUS) === '1' ? 1 : 0, permissionMap.get(legacyId) ?? null],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_menu_items WHERE legacy_id = ?', [legacyId]);
      menuMap.set(legacyId, Number(saved!.id));
    }
    for (const menu of menus.filter((item) => item.PARENT_PID !== null)) {
      await connection.query('UPDATE app_menu_items SET parent_id = ? WHERE legacy_id = ?', [menuMap.get(Number(menu.PARENT_PID)) ?? null, menu.PID]);
    }

    for (const access of await records('USER_MENU.json')) {
      const roleId = roleMap.get(Number(access.PID_GROUP));
      const permissionId = permissionMap.get(Number(access.PAGE_ID));
      if (roleId && permissionId) {
        await connection.query(
          `INSERT INTO app_role_permissions (role_id, permission_id, allowed) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE allowed=VALUES(allowed)`, [roleId, permissionId, Number(access.PERMISSION) ? 1 : 0],
        );
      }
    }
    const inheritLegacyMenuAccess = async (menuId: number, targetKeys: string[]) => {
      const sourcePermissionId = permissionMap.get(menuId);
      if (!sourcePermissionId) return;
      for (const targetKey of targetKeys) {
        await connection.query(
          `INSERT INTO app_role_permissions (role_id, permission_id, allowed)
           SELECT rp.role_id, p.id, rp.allowed
             FROM app_role_permissions rp
             JOIN app_permissions p ON p.permission_key = ?
            WHERE rp.permission_id = ? AND rp.allowed = 1
           ON DUPLICATE KEY UPDATE allowed = GREATEST(app_role_permissions.allowed, VALUES(allowed))`,
          [targetKey, sourcePermissionId],
        );
      }
    };
    await inheritLegacyMenuAccess(13, ['expenses.view', 'expenses.manage']);
    await inheritLegacyMenuAccess(7, ['expense_setup.view', 'expense_setup.manage']);
    await inheritLegacyMenuAccess(27, ['expense_setup.view', 'expense_setup.manage']);
    await inheritLegacyMenuAccess(29, ['site_purchases.view', 'site_purchases.manage']);
    await inheritLegacyMenuAccess(14, ['corporate_purchases.view', 'corporate_purchases.manage']);
    const programmerId = [...roleMap.entries()].find(([legacy]) => legacy === 0)?.[1];
    if (programmerId) {
      await connection.query(
        `INSERT INTO app_role_permissions (role_id, permission_id, allowed)
         SELECT ?, id, 1 FROM app_permissions
         ON DUPLICATE KEY UPDATE allowed=1`, [programmerId],
      );
    }

    const projectMap = new Map<number, number>();
    for (const row of await records('PROJECTS.json')) {
      await connection.query(
        `INSERT INTO app_projects (legacy_id, company_id, name, code, tender_id, package_no, address, contract_value, start_date, end_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), tender_id=VALUES(tender_id), package_no=VALUES(package_no),
           address=VALUES(address), contract_value=VALUES(contract_value), start_date=VALUES(start_date), end_date=VALUES(end_date)`,
        [row.ID, companyId, row.PNAME, row.PRJ_CODE, row.TID, row.PACK_NO, [row.ADDRESS, row.ADDRESS2].filter(Boolean).join(', '),
          row.WO_RATE, row.SDATE, row.EDATE, String(row.STATUS) === '1' ? 'active' : 'completed'],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_projects WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID]);
      projectMap.set(Number(row.ID), Number(saved!.id));
    }
    const siteMap = new Map<number, number>();
    for (const row of await records('PROJECT_SITE.json')) {
      const projectId = projectMap.get(Number(row.PID));
      if (!projectId) continue;
      await connection.query(
        `INSERT INTO app_project_sites (legacy_id, project_id, name, address) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE project_id=VALUES(project_id), name=VALUES(name), address=VALUES(address)`,
        [row.ID, projectId, row.SNAME, row.ADDRESS],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_project_sites WHERE legacy_id = ?', [row.ID]);
      siteMap.set(Number(row.ID), Number(saved!.id));
    }
    for (const row of await records('USER_PROJECT.json')) {
      const userId = userMap.get(Number(row.USER_ID));
      const projectId = projectMap.get(Number(row.PRJ_ID));
      if (userId && projectId) await connection.query('INSERT IGNORE INTO app_user_projects (user_id, project_id) VALUES (?, ?)', [userId, projectId]);
    }
    const expenseTypeMap = new Map<number, number>();
    for (const row of await records('EXPCOST.json')) {
      await connection.query(
        `INSERT INTO app_expense_types
           (legacy_id, company_id, name, phase, refundable, default_rate, default_amount, default_return_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), phase=VALUES(phase), refundable=VALUES(refundable),
           default_rate=VALUES(default_rate), default_amount=VALUES(default_amount),
           default_return_amount=VALUES(default_return_amount)`,
        [row.ID, companyId, row.EXPNAME, row.COST_TIME === 'Before' ? 'pre_award' : 'execution',
          row.TYP === 'YES' ? 1 : 0, row.RATE, row.AMT, row.RET],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_expense_types WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      expenseTypeMap.set(Number(row.ID), Number(saved!.id));
    }

    const employeeMap = new Map<number, number>();
    for (const row of await records('EMPLOYEES.json')) {
      await connection.query(
        `INSERT INTO app_employees
           (legacy_id, company_id, employee_code, first_name, last_name, date_of_birth, phone, email,
            hire_date, salary, department, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE employee_code=VALUES(employee_code), first_name=VALUES(first_name),
           last_name=VALUES(last_name), date_of_birth=VALUES(date_of_birth), phone=VALUES(phone),
           email=VALUES(email), hire_date=VALUES(hire_date), salary=VALUES(salary),
           department=VALUES(department), address=VALUES(address)`,
        [row.ID, companyId, row.EMP_ID ? String(row.EMP_ID).trim() : null, row.FIRSTNAME, row.LASTNAME,
          row.DOB, row.PHONE, row.EMAIL, row.HIREDATE, row.SALARY, row.DEPARTMENT, row.ADDRESS],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_employees WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      employeeMap.set(Number(row.ID), Number(saved!.id));
    }
    for (const row of await records('EMPLOYEES_P.json')) {
      const employeeId = employeeMap.get(Number(row.EMPID));
      const projectId = projectMap.get(Number(row.PRJ_ID));
      if (employeeId && projectId) await connection.query(
        'INSERT IGNORE INTO app_employee_projects (employee_id, project_id) VALUES (?, ?)', [employeeId, projectId],
      );
    }
    for (const row of await records('EMPLOYEES_S.json')) {
      const employeeId = employeeMap.get(Number(row.EMPID));
      const projectId = projectMap.get(Number(row.PRJ_ID));
      const siteId = siteMap.get(Number(row.SITE_ID));
      if (employeeId && projectId) await connection.query(
        'INSERT IGNORE INTO app_employee_projects (employee_id, project_id) VALUES (?, ?)', [employeeId, projectId],
      );
      if (employeeId && siteId) await connection.query(
        'INSERT IGNORE INTO app_employee_sites (employee_id, site_id) VALUES (?, ?)', [employeeId, siteId],
      );
    }

    const supplierMap = new Map<number, number>();
    for (const row of await records('SUPPLIER.json')) {
      await connection.query(
        `INSERT INTO app_suppliers
           (legacy_id, company_id, code, name, address, contact_person, phone, email, supplier_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE code=VALUES(code), name=VALUES(name), address=VALUES(address),
           contact_person=VALUES(contact_person), phone=VALUES(phone), email=VALUES(email),
           supplier_type=VALUES(supplier_type)`,
        [row.ID, companyId, row.CODE, row.SNAME, [row.ADDRESS_1, row.ADDRESS_2].filter(Boolean).join(', '),
          row.CONTACT_PERSON, row.PHONE, row.EMAIL, row.TYP],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_suppliers WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      supplierMap.set(Number(row.ID), Number(saved!.id));
    }

    const unitMap = new Map<number, number>();
    for (const row of await records('T_UOM.json')) {
      await connection.query(
        `INSERT INTO app_units (legacy_id, company_id, name, code, description)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), description=VALUES(description)`,
        [row.ID, companyId, row.UMNAME, row.CODE, row.DESCRIPTION],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_units WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      unitMap.set(Number(row.ID), Number(saved!.id));
    }

    const materialMap = new Map<number, number>();
    for (const row of await records('RAW_MATERIAL.json')) {
      await connection.query(
        `INSERT INTO app_materials (legacy_id, company_id, unit_id, name, details, material_type, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE unit_id=VALUES(unit_id), name=VALUES(name), details=VALUES(details),
           material_type=VALUES(material_type)`,
        [row.ID, companyId, unitMap.get(Number(row.UOM)) ?? null, row.RMNAME, row.DETAILS, row.TYP],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_materials WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      materialMap.set(Number(row.ID), Number(saved!.id));
    }

    const corporateCategoryMap = new Map<number, number>();
    for (const row of await records('T_CATEGORIES.json')) {
      await connection.query(
        `INSERT INTO app_corporate_categories (legacy_id, company_id, name, status)
         VALUES (?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE name=VALUES(name), status='active'`,
        [row.ID, companyId, row.CNAME],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_corporate_categories WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      corporateCategoryMap.set(Number(row.ID), Number(saved!.id));
    }

    const corporateSubcategoryMap = new Map<number, number>();
    for (const row of await records('T_SUBCAT.json')) {
      const categoryId = corporateCategoryMap.get(Number(row.CAT_ID));
      if (!categoryId) continue;
      await connection.query(
        `INSERT INTO app_corporate_subcategories
           (legacy_id, company_id, category_id, name, description, status)
         VALUES (?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name=VALUES(name),
           description=VALUES(description), status='active'`,
        [row.ID, companyId, categoryId, row.SCNAME, row.DESCRIPTION],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_corporate_subcategories WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      corporateSubcategoryMap.set(Number(row.ID), Number(saved!.id));
    }

    const corporateProductMap = new Map<number, number>();
    for (const row of await records('CORP_PRODUCTS.json')) {
      await connection.query(
        `INSERT INTO app_corporate_products
           (legacy_id, company_id, category_id, unit_id, name, description, default_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), unit_id=VALUES(unit_id),
           name=VALUES(name), description=VALUES(description), default_price=VALUES(default_price), status='active'`,
        [row.ID, companyId, corporateCategoryMap.get(Number(row.CAT_ID)) ?? null,
          unitMap.get(Number(row.UOM)) ?? null, row.PNAME, row.DESCRIPTION, row.PRICE],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_corporate_products WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      corporateProductMap.set(Number(row.ID), Number(saved!.id));
    }

    const corporatePurchaseMap = new Map<number, number>();
    for (const row of await records('COR_PURCHASE_MST.json')) {
      const projectId = projectMap.get(Number(row.PRJ_ID));
      if (!projectId) continue;
      await connection.query(
        `INSERT INTO app_corporate_purchases
           (legacy_id, company_id, project_id, site_id, supplier_id, purchase_no, local_supplier,
            supplier_address, purchase_date, purchase_type, challan_no, challan_date, notes,
            legacy_purchase_group, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
         ON DUPLICATE KEY UPDATE project_id=VALUES(project_id), site_id=VALUES(site_id),
           supplier_id=VALUES(supplier_id), purchase_no=VALUES(purchase_no),
           local_supplier=VALUES(local_supplier), supplier_address=VALUES(supplier_address),
           purchase_date=VALUES(purchase_date), purchase_type=VALUES(purchase_type),
           challan_no=VALUES(challan_no), challan_date=VALUES(challan_date), notes=VALUES(notes),
           legacy_purchase_group=VALUES(legacy_purchase_group)`,
        [row.ID, companyId, projectId, siteMap.get(Number(row.SITE_ID)) ?? null,
          supplierMap.get(Number(row.SUPP_ID)) ?? null, row.PUR_NO, row.LOC_SUPP, row.SUP_ADD,
          row.ODATE, row.PUR_TYPE ?? 'corporate', row.CHALLAN, row.CH_DATE, row.NOTES, row.PUR_ID],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_corporate_purchases WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      corporatePurchaseMap.set(Number(row.ID), Number(saved!.id));
    }
    for (const row of await records('COR_PURCHASE_DTL.json')) {
      const purchaseId = corporatePurchaseMap.get(Number(row.PID));
      if (!purchaseId) continue;
      await connection.query(
        `INSERT INTO app_corporate_purchase_lines
           (legacy_id, purchase_id, category_id, subcategory_id, product_id, unit_id, site_id,
            quantity, unit_price, discount, total_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE purchase_id=VALUES(purchase_id), category_id=VALUES(category_id),
           subcategory_id=VALUES(subcategory_id), product_id=VALUES(product_id), unit_id=VALUES(unit_id),
           site_id=VALUES(site_id), quantity=VALUES(quantity), unit_price=VALUES(unit_price),
           discount=VALUES(discount), total_amount=VALUES(total_amount), notes=VALUES(notes)`,
        [row.ID, purchaseId, corporateCategoryMap.get(Number(row.CAT_ID)) ?? null,
          corporateSubcategoryMap.get(Number(row.SUB_CAT_ID)) ?? null,
          corporateProductMap.get(Number(row.PROD_ID)) ?? null, unitMap.get(Number(row.UOM)) ?? null,
          siteMap.get(Number(row.SITE_ID)) ?? null, row.QTY ?? 0, row.PRICE ?? 0,
          row.DISCOUNT ?? 0, row.TOTAL ?? 0, row.NOTES],
      );
    }

    const expenseHeadMap = new Map<number, number>();
    for (const row of await records('ENG_EXPHEAD.json')) {
      await connection.query(
        `INSERT INTO app_engineer_expense_heads (legacy_id, company_id, name, status)
         VALUES (?, ?, ?, 'active') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [row.ID, companyId, row.EXPNAME ?? `Unspecified expense #${row.ID}`],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_engineer_expense_heads WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      expenseHeadMap.set(Number(row.ID), Number(saved!.id));
    }

    const expensePaymentMap = new Map<number, number>();
    for (const row of await records('EXPAY_MST.json')) {
      const projectId = projectMap.get(Number(row.PRJ_ID));
      if (!projectId) continue;
      await connection.query(
        `INSERT INTO app_expense_payments
           (legacy_id, company_id, project_id, payment_no, pay_to, payee_address, payment_date,
            payment_type, reference_no, reference_date, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
         ON DUPLICATE KEY UPDATE project_id=VALUES(project_id), payment_no=VALUES(payment_no),
           pay_to=VALUES(pay_to), payee_address=VALUES(payee_address), payment_date=VALUES(payment_date),
           payment_type=VALUES(payment_type), reference_no=VALUES(reference_no),
           reference_date=VALUES(reference_date), notes=VALUES(notes)`,
        [row.ID, companyId, projectId, row.PAY_NO, row.PAY_TO, row.SUP_ADD, row.PDATE,
          row.PAY_TYPE, row.CHALLAN, row.CH_DATE, row.NOTES],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_expense_payments WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      expensePaymentMap.set(Number(row.ID), Number(saved!.id));
    }
    for (const row of await records('EXPAY_DTL.json')) {
      const paymentId = expensePaymentMap.get(Number(row.PID));
      if (!paymentId) continue;
      await connection.query(
        `INSERT INTO app_expense_payment_lines
           (legacy_id, payment_id, expense_type_id, quantity, unit_name, amount, discount,
            returned_amount, total_amount, return_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE payment_id=VALUES(payment_id), expense_type_id=VALUES(expense_type_id),
           quantity=VALUES(quantity), unit_name=VALUES(unit_name), amount=VALUES(amount),
           discount=VALUES(discount), returned_amount=VALUES(returned_amount),
           total_amount=VALUES(total_amount), return_date=VALUES(return_date), notes=VALUES(notes)`,
        [row.ID, paymentId, expenseTypeMap.get(Number(row.COST_ID)) ?? null, row.QTY, row.UOM,
          row.AMT, row.DISCOUNT, row.RTN_AMT, row.TOTAL ?? 0, row.RTN_DATE, row.NOTES],
      );
    }

    const sitePurchaseMap = new Map<number, number>();
    const sitePurchaseDateMap = new Map<number, string | number | null>();
    for (const row of await records('PURCHASE_MST.json')) {
      const projectId = projectMap.get(Number(row.PRJ_ID));
      const employeeId = employeeMap.get(Number(row.SE_ID));
      if (!projectId || !employeeId) continue;
      await connection.query(
        `INSERT INTO app_site_purchases
           (legacy_id, company_id, project_id, employee_id, supplier_id, purchase_no, local_supplier,
            supplier_address, purchase_date, purchase_type, challan_no, challan_date, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
         ON DUPLICATE KEY UPDATE project_id=VALUES(project_id), employee_id=VALUES(employee_id),
           supplier_id=VALUES(supplier_id), purchase_no=VALUES(purchase_no), local_supplier=VALUES(local_supplier),
           supplier_address=VALUES(supplier_address), purchase_date=VALUES(purchase_date),
           purchase_type=VALUES(purchase_type), challan_no=VALUES(challan_no),
           challan_date=VALUES(challan_date), notes=VALUES(notes)`,
        [row.ID, companyId, projectId, employeeId, supplierMap.get(Number(row.SUPP_ID)) ?? null,
          row.PUR_NO, row.LOC_SUPP, row.SUP_ADD, row.ODATE, row.PUR_TYPE === 'C' ? 'corporate' : 'local',
          row.CHALLAN, row.CH_DATE, row.NOTES],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_site_purchases WHERE company_id = ? AND legacy_id = ?', [companyId, row.ID],
      );
      sitePurchaseMap.set(Number(row.ID), Number(saved!.id));
      sitePurchaseDateMap.set(Number(row.ID), row.ODATE ?? null);
    }
    for (const row of await records('PURCHASE_DTL.json')) {
      const purchaseId = sitePurchaseMap.get(Number(row.PID));
      const materialId = materialMap.get(Number(row.PROD_ID));
      if (!purchaseId || !materialId) continue;
      await connection.query(
        `INSERT INTO app_site_purchase_materials
           (legacy_id, purchase_id, material_id, unit_id, site_id, entry_date, quantity,
            unit_price, discount, total_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE purchase_id=VALUES(purchase_id), material_id=VALUES(material_id),
           unit_id=VALUES(unit_id), site_id=VALUES(site_id), entry_date=VALUES(entry_date),
           quantity=VALUES(quantity), unit_price=VALUES(unit_price), discount=VALUES(discount),
           total_amount=VALUES(total_amount), notes=VALUES(notes)`,
        [row.ID, purchaseId, materialId, unitMap.get(Number(row.UOM)) ?? null,
          Number(row.SITE_ID) === 0 ? null : (siteMap.get(Number(row.SITE_ID)) ?? null),
          row.P_DATE ?? sitePurchaseDateMap.get(Number(row.PID)) ?? row.ENT_DATE,
          row.QTY ?? 0, row.PRICE ?? 0, row.DISCOUNT ?? 0, row.TOTAL ?? 0, row.NOTES],
      );
    }
    for (const row of await records('PURCHASE_DTL1.json')) {
      const purchaseId = sitePurchaseMap.get(Number(row.PID));
      if (!purchaseId) continue;
      await connection.query(
        `INSERT INTO app_site_purchase_expenses
           (legacy_id, purchase_id, expense_head_id, site_id, entry_date, amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE purchase_id=VALUES(purchase_id), expense_head_id=VALUES(expense_head_id),
           site_id=VALUES(site_id), entry_date=VALUES(entry_date), amount=VALUES(amount), notes=VALUES(notes)`,
        [row.ID, purchaseId, expenseHeadMap.get(Number(row.OTHER_EXP)) ?? null,
          Number(row.SITE_ID) === 0 ? null : (siteMap.get(Number(row.SITE_ID)) ?? null),
          row.P_DATE ?? sitePurchaseDateMap.get(Number(row.PID)) ?? row.ENT_DATE,
          row.TOTAL ?? 0, row.NOTES],
      );
    }

    await connection.query(
      `INSERT INTO app_audit_logs (company_id, action, entity_type, after_json)
       VALUES (?, 'legacy_import', 'dataset', JSON_OBJECT('source', 'Data', 'status', 'completed'))`,
      [companyId],
    );

    await connection.commit();
    console.log('Legacy access, project, site, and expense setup data imported successfully.');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
