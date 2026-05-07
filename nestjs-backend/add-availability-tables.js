/* eslint-disable */
// Idempotent DDL: creates availability_slots and availability_blackouts on production MariaDB.
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

const SLOTS_DDL = `CREATE TABLE IF NOT EXISTS \`availability_slots\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(36) NOT NULL,
  \`dayOfWeek\` INT NOT NULL,
  \`startTime\` VARCHAR(5) NOT NULL,
  \`endTime\` VARCHAR(5) NOT NULL,
  \`isRecurring\` BOOLEAN NOT NULL DEFAULT 1,
  \`recurringUntil\` DATE NULL,
  \`isActive\` BOOLEAN NOT NULL DEFAULT 1,
  \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY \`IDX_availability_slots_userId\` (\`userId\`),
  KEY \`IDX_availability_slots_userId_day\` (\`userId\`, \`dayOfWeek\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const BLACKOUTS_DDL = `CREATE TABLE IF NOT EXISTS \`availability_blackouts\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`userId\` VARCHAR(36) NOT NULL,
  \`startDate\` DATE NOT NULL,
  \`endDate\` DATE NOT NULL,
  \`reason\` VARCHAR(200) NULL,
  \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY \`IDX_availability_blackouts_userId\` (\`userId\`),
  KEY \`IDX_availability_blackouts_userId_dates\` (\`userId\`, \`startDate\`, \`endDate\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

async function tableExists(conn, dbName, tableName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [dbName, tableName],
  );
  return rows[0].c > 0;
}

async function tableCount(conn, dbName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [dbName],
  );
  return rows[0].c;
}

(async () => {
  const cfg = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  };
  console.log(`[DB-Agent] Connecting to ${cfg.host}:${cfg.port} db=${cfg.database} user=${cfg.user}`);
  const conn = await mysql.createConnection(cfg);
  try {
    const before = await tableCount(conn, cfg.database);
    console.log(`[DB-Agent] Tables before: ${before}`);

    const slotsExists = await tableExists(conn, cfg.database, 'availability_slots');
    if (slotsExists) {
      console.log('[DB-Agent] availability_slots already exists — skipping.');
    } else {
      await conn.query(SLOTS_DDL);
      console.log('[DB-Agent] Created availability_slots.');
    }

    const blackoutsExists = await tableExists(conn, cfg.database, 'availability_blackouts');
    if (blackoutsExists) {
      console.log('[DB-Agent] availability_blackouts already exists — skipping.');
    } else {
      await conn.query(BLACKOUTS_DDL);
      console.log('[DB-Agent] Created availability_blackouts.');
    }

    const after = await tableCount(conn, cfg.database);
    const slotsOk = await tableExists(conn, cfg.database, 'availability_slots');
    const blackoutsOk = await tableExists(conn, cfg.database, 'availability_blackouts');
    console.log(`[DB-Agent] Tables after: ${after}`);
    console.log(`[DB-Agent] verify: availability_slots=${slotsOk} availability_blackouts=${blackoutsOk}`);
  } finally {
    await conn.end();
  }
})().catch((err) => {
  console.error('[DB-Agent] ERROR:', err.message);
  process.exit(1);
});
