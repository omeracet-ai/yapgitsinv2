/* eslint-disable */
// Idempotent DDL: creates job_templates on production MariaDB.
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

const DDL = `CREATE TABLE IF NOT EXISTS \`job_templates\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(36) NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`categoryId\` VARCHAR(36) NULL,
  \`location\` VARCHAR(200) NOT NULL,
  \`budgetMin\` FLOAT NULL,
  \`budgetMax\` FLOAT NULL,
  \`photos\` LONGTEXT NULL,
  \`useCount\` INT NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_jt_userId\` (\`userId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

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
    await conn.query(DDL);
    console.log('[ok] job_templates created/skipped');
  } catch (e) {
    console.error('[err]', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
