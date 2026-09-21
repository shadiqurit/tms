import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2';
import { db } from '../db.js';
import { parseLegacyJson } from './legacy-json.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type LegacyRow = Record<string, JsonValue>;

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

function cell(value: JsonValue | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function importFile(file: string) {
  const contents = await fs.readFile(path.join(dataDir, file), 'utf8');
  const parsed = parseLegacyJson<{ recordset?: LegacyRow[] }>(contents);
  const rows = Array.isArray(parsed.recordset) ? parsed.recordset : [];
  const tableName = identifier(path.basename(file, '.json'));
  const previousTableName = `legacy_${tableName}`;
  const sourceColumns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const columnMap = new Map<string, string>();
  const used = new Set<string>();

  for (const sourceColumn of sourceColumns) {
    const base = identifier(sourceColumn);
    let target = base;
    let suffix = 2;
    while (used.has(target) || target.startsWith('_legacy_')) {
      target = `${base.slice(0, 50)}_${suffix++}`;
    }
    used.add(target);
    columnMap.set(sourceColumn, target);
  }

  const [[previousTable]] = await db.query<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [previousTableName],
  );
  const [[currentTable]] = await db.query<RowDataPacket[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [tableName],
  );
  if (previousTable && !currentTable) {
    await db.query(`RENAME TABLE ${quoted(previousTableName)} TO ${quoted(tableName)}`);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${quoted(tableName)} (
      _legacy_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      _legacy_source_file VARCHAR(255) NOT NULL,
      _legacy_source_row INT UNSIGNED NOT NULL,
      _legacy_raw JSON NOT NULL,
      _legacy_imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (_legacy_id),
      UNIQUE KEY uq_legacy_source_row (_legacy_source_file, _legacy_source_row)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  const [existingRows] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM ${quoted(tableName)}`);
  const existing = new Set(existingRows.map((row) => String(row.Field).toLowerCase()));
  for (const targetColumn of columnMap.values()) {
    if (!existing.has(targetColumn.toLowerCase())) {
      await db.query(`ALTER TABLE ${quoted(tableName)} ADD COLUMN ${quoted(targetColumn)} LONGTEXT NULL`);
    }
  }

  const targetColumns = sourceColumns.map((sourceColumn) => columnMap.get(sourceColumn)!);
  const insertColumns = ['_legacy_source_file', '_legacy_source_row', '_legacy_raw', ...targetColumns];
  const batchSize = 100;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const placeholders = batch.map(() => `(${insertColumns.map(() => '?').join(', ')})`).join(', ');
    const values = batch.flatMap((row, index) => [
      file,
      offset + index + 1,
      JSON.stringify(row),
      ...sourceColumns.map((column) => cell(row[column])),
    ]);
    const updates = ['_legacy_raw', ...targetColumns]
      .map((column) => `${quoted(column)}=VALUES(${quoted(column)})`)
      .join(', ');

    await db.query(
      `INSERT INTO ${quoted(tableName)} (${insertColumns.map(quoted).join(', ')}) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE ${updates}`,
      values,
    );
  }

  console.log(`${tableName}: ${rows.length} rows imported`);
  return rows.length;
}

async function main() {
  const files = (await fs.readdir(dataDir)).filter((file) => file.toLowerCase().endsWith('.json')).sort();
  let total = 0;
  try {
    for (const file of files) total += await importFile(file);
    console.log(`Imported ${total} records from ${files.length} JSON files.`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
