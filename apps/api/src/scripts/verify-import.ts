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
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
