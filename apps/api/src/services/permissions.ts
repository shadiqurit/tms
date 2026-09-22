import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { db } from '../db.js';

type Database = Pool | PoolConnection;

export async function effectivePermissionKeys(
  userId: number,
  roleId: number,
  roleKey: string,
  connection: Database = db,
) {
  const [rows] = await connection.query<RowDataPacket[]>(
    roleKey === 'programmer'
      ? 'SELECT permission_key AS permissionKey FROM app_permissions ORDER BY permission_key'
      : `SELECT p.permission_key AS permissionKey
           FROM app_permissions p
           LEFT JOIN app_role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
           LEFT JOIN app_user_permissions up ON up.permission_id = p.id AND up.user_id = ?
          WHERE COALESCE(up.allowed, rp.allowed, 0) = 1
          ORDER BY p.permission_key`,
    roleKey === 'programmer' ? [] : [roleId, userId],
  );
  return rows.map((row) => String(row.permissionKey));
}

export async function hasEffectivePermission(
  userId: number,
  roleId: number,
  roleKey: string,
  permissionKey: string,
  connection: Database = db,
) {
  if (roleKey === 'programmer') return true;
  const [[row]] = await connection.query<RowDataPacket[]>(
    `SELECT COALESCE(up.allowed, rp.allowed, 0) AS allowed
       FROM app_permissions p
       LEFT JOIN app_role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
       LEFT JOIN app_user_permissions up ON up.permission_id = p.id AND up.user_id = ?
      WHERE p.permission_key = ?
      LIMIT 1`,
    [roleId, userId, permissionKey],
  );
  return Boolean(row?.allowed);
}
