/* eslint-disable */
// Idempotent DDL: adds 2FA columns (twoFactorEnabled, twoFactorSecret) to users on production MariaDB.
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '.env.production') });
require('dotenv').config({ path: path.join(__dirname, '.env.production.local'), override: true });

const TARGETS = [
  { table: 'users', column: 'twoFactorEnabled', ddl: 'ADD COLUMN `twoFactorEnabled` TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'users', column: 'twoFactorSecret', ddl: 'ADD COLUMN `twoFactorSecret` VARCHAR(64) NULL' },
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    for (const t of TARGETS) {
      const [rows] = await conn.query(`SHOW COLUMNS FROM \`${t.table}\` LIKE ?`, [t.column]);
      if (rows.length > 0) {
        console.log(`[ok] ${t.table}.${t.column} skipped`);
        continue;
      }
      await conn.query(`ALTER TABLE \`${t.table}\` ${t.ddl}`);
      console.log(`[ok] ${t.table}.${t.column} added`);
    }
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[err]', err.message);
    if (conn) try { await conn.end(); } catch (_) {}
    process.exit(1);
  }
})();
