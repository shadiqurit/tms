import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2';
import { db } from '../db.js';
import { parseLegacyJson } from './legacy-json.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../../Data');

function identifier(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  const safe = /^\d/.test(normalized) ? `_${normalized}` : normalized;
  return (safe || 'value').slice(0, 55);
}

function quoted(value: string) {
  return `\`${value.replace(/`/g, '``')}\``;
}

async function count(table: string) {
  const [[row]] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM ${quoted(table)}`);
  return Number(row!.count);
}

async function main() {
  try {
    const normalizedTables = [
      'app_companies', 'app_roles', 'app_users', 'app_permissions', 'app_role_permissions', 'app_menu_items',
      'app_projects', 'app_project_sites', 'app_user_projects', 'app_expense_types', 'app_audit_logs',
      'app_engineer_accounts', 'app_engineer_deposits', 'app_site_purchases',
      'app_site_purchase_materials', 'app_site_purchase_expenses',
    ];
    const normalizedCounts: Record<string, number> = {};
    for (const table of normalizedTables) normalizedCounts[table] = await count(table);

    const files = (await fs.readdir(dataDir)).filter((file) => file.toLowerCase().endsWith('.json')).sort();
    let expectedTotal = 0;
    let actualTotal = 0;
    const mismatches: string[] = [];

    for (const file of files) {
      const contents = await fs.readFile(path.join(dataDir, file), 'utf8');
      const parsed = parseLegacyJson<{ recordset?: unknown[] }>(contents);
      const expected = Array.isArray(parsed.recordset) ? parsed.recordset.length : 0;
      const table = identifier(path.basename(file, '.json'));
      const actual = await count(table);
      expectedTotal += expected;
      actualTotal += actual;
      if (actual !== expected) mismatches.push(`${table}: expected ${expected}, found ${actual}`);
    }

    console.table(normalizedCounts);
    console.log(`Raw JSON verification: ${files.length} tables, ${actualTotal}/${expectedTotal} rows.`);
    if (mismatches.length) throw new Error(`Import verification failed:\n${mismatches.join('\n')}`);
    if (Object.entries(normalizedCounts).some(([, value]) => value === 0)) {
      throw new Error('At least one normalized table is empty after import.');
    }

    const depositSource = parseLegacyJson<{ recordset: Array<{ DDATE: string | null; AMT: number | null }> }>(
      await fs.readFile(path.join(dataDir, 'DEPOSIT_DTL.json'), 'utf8'),
    ).recordset;
    const [[depositResult]] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS rowCount, COALESCE(SUM(amount), 0) AS amountTotal,
              SUM(deposit_date IS NULL) AS nullDates, SUM(amount IS NULL) AS nullAmounts
         FROM app_engineer_deposits`,
    );
    const sourceAmount = depositSource.reduce((sum, item) => sum + Number(item.AMT ?? 0), 0);
    const expectedNullDates = depositSource.filter((item) => !item.DDATE).length;
    const expectedNullAmounts = depositSource.filter((item) => item.AMT === null).length;
    if (Number(depositResult!.rowCount) !== depositSource.length ||
        Number(depositResult!.amountTotal) !== sourceAmount ||
        Number(depositResult!.nullDates) !== expectedNullDates ||
        Number(depositResult!.nullAmounts) !== expectedNullAmounts) {
      throw new Error('Engineer deposit reconciliation failed.');
    }
    console.log(`Engineer deposits reconciled: ${depositSource.length} rows, BDT ${sourceAmount.toFixed(2)}, ${expectedNullDates} null date, ${expectedNullAmounts} null amount.`);

    const [[purchaseResult]] = await db.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM app_site_purchase_materials) AS materialRows,
              (SELECT COALESCE(SUM(total_amount), 0) FROM app_site_purchase_materials) AS materialTotal,
              (SELECT COUNT(*) FROM app_site_purchase_expenses) AS expenseRows,
              (SELECT COALESCE(SUM(amount), 0) FROM app_site_purchase_expenses) AS expenseTotal`,
    );
    console.log(`Engineer purchases reconciled: ${purchaseResult!.materialRows} material rows (BDT ${Number(purchaseResult!.materialTotal).toFixed(2)}), ${purchaseResult!.expenseRows} expense rows (BDT ${Number(purchaseResult!.expenseTotal).toFixed(2)}).`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
