/* eslint-disable */
// Idempotent DDL: adds moderation columns (flagged, flagReason) to chat_messages and job_questions on production MariaDB.
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

const TARGETS = [
  { table: 'chat_messages', column: 'flagged', ddl: 'ADD COLUMN `flagged` TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'chat_messages', column: 'flagReason', ddl: 'ADD COLUMN `flagReason` VARCHAR(200) NULL' },
  { table: 'job_questions', column: 'flagged', ddl: 'ADD COLUMN `flagged` TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'job_questions', column: 'flagReason', ddl: 'ADD COLUMN `flagReason` VARCHAR(200) NULL' },
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    for (const t of TARGETS) {
      const [tbls] = await conn.query('SHOW TABLES LIKE ?', [t.table]);
      if (tbls.length === 0) {
        console.log(`[skip] ${t.table} does not exist`);
        continue;
      }
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t.table}\` LIKE ?`, [t.column]);
      if (cols.length > 0) {
        console.log(`[ok] ${t.table}.${t.column} skipped (exists)`);
        continue;
      }
      await conn.query(`ALTER TABLE \`${t.table}\` ${t.ddl}`);
      console.log(`[ok] ${t.table}.${t.column} added`);
    }
  } catch (e) {
    console.error('[err]', e.message);
    await conn.end();
    process.exit(1);
  }
  await conn.end();
})();
