import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { db } from '../db.js';
import { parseLegacyJson } from './legacy-json.js';

type LegacyRow = Record<string, string | number | null>;
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../../Data');

async function records(file: string) {
  const contents = await fs.readFile(path.join(dataDir, file), 'utf8');
  return parseLegacyJson<{ recordset: LegacyRow[] }>(contents).recordset;
}

async function legacyMap(connection: PoolConnection, table: string, companyId?: number) {
  const where = companyId ? ' WHERE company_id = ?' : '';
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT id, legacy_id FROM ${table}${where}`, companyId ? [companyId] : []);
  return new Map(rows.filter((row) => row.legacy_id !== null).map((row) => [Number(row.legacy_id), Number(row.id)]));
}

async function main() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[company]] = await connection.query<RowDataPacket[]>('SELECT id FROM app_companies WHERE legacy_id = 1 LIMIT 1');
    if (!company) throw new Error('Company legacy_id=1 was not found. Run the base legacy import first.');
    const companyId = Number(company.id);
    const [projectMap, siteMap, categoryMap, productMap, unitMap, employeeMap] = await Promise.all([
      legacyMap(connection, 'app_projects', companyId), legacyMap(connection, 'app_project_sites'),
      legacyMap(connection, 'app_corporate_categories', companyId), legacyMap(connection, 'app_corporate_products', companyId),
      legacyMap(connection, 'app_units', companyId), legacyMap(connection, 'app_employees', companyId),
    ]);

    const transferMap = new Map<number, number>();
    for (const row of await records('COR_TRANSFER_MST.json')) {
      const fromProjectId = projectMap.get(Number(row.FRM_PRJ_ID));
      const receiveProjectId = projectMap.get(Number(row.RCV_PRJ_ID));
      if (!fromProjectId || !receiveProjectId || !row.TRNSF_DATE) throw new Error(`Transfer ${row.ID} has an unmapped project or date.`);
      await connection.query(
        `INSERT INTO app_corporate_transfers
           (legacy_id, company_id, transfer_no, from_project_id, from_site_id, receive_project_id,
            receive_site_id, transfer_date, notes, legacy_project_id, legacy_transfer_group, engineer_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
         ON DUPLICATE KEY UPDATE transfer_no=VALUES(transfer_no), from_project_id=VALUES(from_project_id),
           from_site_id=VALUES(from_site_id), receive_project_id=VALUES(receive_project_id),
           receive_site_id=VALUES(receive_site_id), transfer_date=VALUES(transfer_date), notes=VALUES(notes),
           legacy_project_id=VALUES(legacy_project_id), legacy_transfer_group=VALUES(legacy_transfer_group),
           engineer_id=VALUES(engineer_id)`,
        [row.ID, companyId, row.TRN_NO, fromProjectId, siteMap.get(Number(row.FRM_SITE_ID)) ?? null,
          receiveProjectId, siteMap.get(Number(row.RCV_SITE_ID)) ?? null, row.TRNSF_DATE, row.NOTES,
          row.PRJ_ID, row.TRN_ID, employeeMap.get(Number(row.SE_ID)) ?? null],
      );
      const [[saved]] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM app_corporate_transfers WHERE company_id = ? AND legacy_id = ? LIMIT 1', [companyId, row.ID],
      );
      if (!saved) throw new Error(`Transfer ${row.ID} could not be saved.`);
      transferMap.set(Number(row.ID), Number(saved.id));
    }

    for (const row of await records('COR_TRANSFER_DTL.json')) {
      const transferId = transferMap.get(Number(row.PID));
      if (!transferId) throw new Error(`Transfer line ${row.ID} has an unmapped header ${row.PID}.`);
      await connection.query(
        `INSERT INTO app_corporate_transfer_lines
           (legacy_id, transfer_id, category_id, product_id, unit_id, destination_site_id,
            quantity, unit_price, other_cost, other_expense, total_amount, notes,
            transfer_date, legacy_project_id, engineer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE transfer_id=VALUES(transfer_id), category_id=VALUES(category_id),
           product_id=VALUES(product_id), unit_id=VALUES(unit_id), destination_site_id=VALUES(destination_site_id),
           quantity=VALUES(quantity), unit_price=VALUES(unit_price), other_cost=VALUES(other_cost),
           other_expense=VALUES(other_expense), total_amount=VALUES(total_amount), notes=VALUES(notes),
           transfer_date=VALUES(transfer_date), legacy_project_id=VALUES(legacy_project_id), engineer_id=VALUES(engineer_id)`,
        [row.ID, transferId, categoryMap.get(Number(row.CAT_ID)) ?? null,
          productMap.get(Number(row.PROD_ID)) ?? null, unitMap.get(Number(row.UOM)) ?? null,
          siteMap.get(Number(row.S_ID)) ?? null, row.QTY ?? 0, row.PRICE ?? 0, row.OTHER_COST ?? 0,
          row.OTHER_EXP ?? 0, row.TOTAL ?? 0, row.NOTES, row.TDT, row.PRJ_ID,
          employeeMap.get(Number(row.SE_ID)) ?? null],
      );
    }
    await connection.commit();

    const [[counts]] = await connection.query<RowDataPacket[]>(
      `SELECT (SELECT COUNT(*) FROM app_corporate_transfers WHERE company_id = ?) AS headers,
              (SELECT COUNT(*) FROM app_corporate_transfer_lines l JOIN app_corporate_transfers h ON h.id=l.transfer_id WHERE h.company_id = ?) AS lineCount,
              (SELECT COALESCE(SUM(l.total_amount),0) FROM app_corporate_transfer_lines l JOIN app_corporate_transfers h ON h.id=l.transfer_id WHERE h.company_id = ?) AS totalAmount`,
      [companyId, companyId, companyId],
    );
    if (!counts) throw new Error('Corporate transfer reconciliation query returned no result.');
    console.log(`Corporate transfers imported: ${counts.headers} headers, ${counts.lineCount} lines, total ${counts.totalAmount}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
