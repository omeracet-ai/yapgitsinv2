/* eslint-disable */
// Idempotent DDL: creates user_blocks and user_reports on production MariaDB.
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

const USER_BLOCKS_DDL = `CREATE TABLE IF NOT EXISTS \`user_blocks\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`blockerUserId\` VARCHAR(36) NOT NULL,
  \`blockedUserId\` VARCHAR(36) NOT NULL,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_block_pair\` (\`blockerUserId\`, \`blockedUserId\`),
  INDEX \`idx_blocker\` (\`blockerUserId\`),
  INDEX \`idx_blocked\` (\`blockedUserId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const USER_REPORTS_DDL = `CREATE TABLE IF NOT EXISTS \`user_reports\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`reporterUserId\` VARCHAR(36) NOT NULL,
  \`reportedUserId\` VARCHAR(36) NOT NULL,
  \`reason\` ENUM('spam','harassment','fraud','inappropriate','other') NOT NULL,
  \`description\` TEXT NULL,
  \`status\` ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  \`adminNote\` TEXT NULL,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_reporter\` (\`reporterUserId\`),
  INDEX \`idx_reported\` (\`reportedUserId\`),
  INDEX \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function existed(conn, table) {
  const [rows] = await conn.query("SHOW TABLES LIKE ?", [table]);
  return rows.length > 0;
}

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

    const hadBlocks = await existed(conn, 'user_blocks');
    await conn.query(USER_BLOCKS_DDL);
    console.log(`[ok] user_blocks ${hadBlocks ? 'skipped' : 'created'}`);

    const hadReports = await existed(conn, 'user_reports');
    await conn.query(USER_REPORTS_DDL);
    console.log(`[ok] user_reports ${hadReports ? 'skipped' : 'created'}`);
  } catch (err) {
    console.error('[fail]', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
