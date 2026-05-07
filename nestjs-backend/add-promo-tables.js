/* eslint-disable */
// Idempotent DDL: creates promo_codes and promo_redemptions on production MariaDB.
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

const PROMO_CODES_DDL = `CREATE TABLE IF NOT EXISTS \`promo_codes\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`code\` VARCHAR(32) NOT NULL UNIQUE,
  \`discountType\` ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  \`discountValue\` FLOAT NOT NULL,
  \`maxRedemptions\` INT NULL,
  \`redeemedCount\` INT NOT NULL DEFAULT 0,
  \`minSpend\` FLOAT NULL,
  \`validFrom\` DATETIME NULL,
  \`validUntil\` DATETIME NULL,
  \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
  \`description\` VARCHAR(200) NULL,
  \`appliesTo\` ENUM('tokens','offer','all') NOT NULL DEFAULT 'all',
  \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const PROMO_REDEMPTIONS_DDL = `CREATE TABLE IF NOT EXISTS \`promo_redemptions\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`codeId\` VARCHAR(36) NOT NULL,
  \`userId\` VARCHAR(36) NOT NULL,
  \`appliedAmount\` FLOAT NOT NULL,
  \`refType\` VARCHAR(20) NULL,
  \`refId\` VARCHAR(36) NULL,
  \`redeemedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_promo_red_codeId\` (\`codeId\`),
  INDEX \`idx_promo_red_userId\` (\`userId\`)
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

    const hadPromo = await existed(conn, 'promo_codes');
    await conn.query(PROMO_CODES_DDL);
    console.log(`[ok] promo_codes ${hadPromo ? 'skipped' : 'created'}`);

    const hadRed = await existed(conn, 'promo_redemptions');
    await conn.query(PROMO_REDEMPTIONS_DDL);
    console.log(`[ok] promo_redemptions ${hadRed ? 'skipped' : 'created'}`);
  } catch (err) {
    console.error('[fail]', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
})();
