/* eslint-disable */
// Idempotent: creates admin_audit_logs table.
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '.env.production') });
dotenv.config({ path: path.join(__dirname, '.env.production.local'), override: true });

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS \`admin_audit_logs\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`adminUserId\` VARCHAR(36) NOT NULL,
  \`action\` VARCHAR(50) NOT NULL,
  \`targetType\` VARCHAR(50) NULL,
  \`targetId\` VARCHAR(36) NULL,
  \`payload\` LONGTEXT NULL,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_aal_admin\` (\`adminUserId\`),
  INDEX \`idx_aal_created\` (\`createdAt\`)
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

    await conn.query(CREATE_TABLE);
    console.log('[ok] admin_audit_logs created/skipped');
  } catch (e) {
    console.error('[err]', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
