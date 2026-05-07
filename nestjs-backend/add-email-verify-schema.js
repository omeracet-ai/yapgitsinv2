/* eslint-disable */
// Idempotent: adds users.emailVerified + email_verification_tokens table.
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '.env.production') });
dotenv.config({ path: path.join(__dirname, '.env.production.local'), override: true });

const CREATE_TOKENS = `CREATE TABLE IF NOT EXISTS \`email_verification_tokens\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(36) NOT NULL,
  \`tokenHash\` VARCHAR(128) NOT NULL UNIQUE,
  \`expiresAt\` DATETIME NOT NULL,
  \`usedAt\` DATETIME NULL,
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_evt_userId\` (\`userId\`),
  INDEX \`idx_evt_expires\` (\`expiresAt\`)
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

    const [cols] = await conn.query("SHOW COLUMNS FROM `users` LIKE 'emailVerified'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE `users` ADD COLUMN `emailVerified` TINYINT(1) NOT NULL DEFAULT 0");
      console.log('[ok] users.emailVerified added');
    } else {
      console.log('[ok] users.emailVerified skipped');
    }

    await conn.query(CREATE_TOKENS);
    console.log('[ok] email_verification_tokens created/skipped');
  } catch (e) {
    console.error('[err]', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
