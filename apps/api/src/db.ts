import mysql from 'mysql2/promise';
import { config } from './config.js';

export const db = mysql.createPool({
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  database: config.MYSQL_DATABASE,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
  enableKeepAlive: true,
});
