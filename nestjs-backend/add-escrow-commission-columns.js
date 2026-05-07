/* eslint-disable */
// Idempotent DDL: adds platformFeePct, platformFeeAmount, taskerNetAmount to payment_escrows.
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, '.env.production'));
loadEnv(path.join(__dirname, '.env.production.local')); // overrides

const COLUMNS = [
  { name: 'platformFeePct', ddl: 'ADD COLUMN `platformFeePct` FLOAT NOT NULL DEFAULT 10' },
  { name: 'platformFeeAmount', ddl: 'ADD COLUMN `platformFeeAmount` FLOAT NULL' },
  { name: 'taskerNetAmount', ddl: 'ADD COLUMN `taskerNetAmount` FLOAT NULL' },
];

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    for (const col of COLUMNS) {
      const [rows] = await conn.query(
        `SHOW COLUMNS FROM payment_escrows LIKE ?`,
        [col.name],
      );
      if (rows.length > 0) {
        console.log(`[skip] ${col.name} already exists`);
        continue;
      }
      await conn.query(`ALTER TABLE \`payment_escrows\` ${col.ddl}`);
      console.log(`[ok] ${col.name} added`);
    }
    await conn.end();
  } catch (err) {
    console.error('[fail]', err.message);
    if (conn) try { await conn.end(); } catch (_) {}
    process.exit(1);
  }
})();
