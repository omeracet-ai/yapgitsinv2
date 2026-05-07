/* eslint-disable */
// Idempotent DDL: creates password_reset_tokens on production MariaDB.
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '.env.production') });
dotenv.config({ path: path.join(__dirname, '.env.production.local'), override: true });

const DDL = `CREATE TABLE IF NOT EXISTS \`password_reset_tokens\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(36) NOT NULL,
  \`tokenHash\` VARCHAR(128) NOT NULL UNIQUE,
  \`expiresAt\` DATETIME NOT NULL,
  \`usedAt\` DATETIME NULL,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_prt_userId\` (\`userId\`),
  INDEX \`idx_prt_expires\` (\`expiresAt\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await conn.query(DDL);
    console.log('[ok] password_reset_tokens created/skipped');
  } catch (e) {
    console.error('[err]', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
