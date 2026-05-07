/* eslint-disable */
// Idempotent DDL: adds offers.lineItems LONGTEXT NULL on production MariaDB.
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
    const [rows] = await conn.query("SHOW COLUMNS FROM offers LIKE 'lineItems'");
    if (rows.length > 0) {
      console.log('[ok] skipped (exists)');
      await conn.end();
      process.exit(0);
    }
    await conn.query('ALTER TABLE offers ADD COLUMN lineItems LONGTEXT NULL');
    console.log('[ok] lineItems column added');
    await conn.end();
    process.exit(0);
  } catch (e) {
    console.error('[err]', e && e.message ? e.message : e);
    if (conn) try { await conn.end(); } catch {}
    process.exit(1);
  }
})();
