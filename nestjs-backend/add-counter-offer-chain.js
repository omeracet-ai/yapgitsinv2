// One-shot DDL: add offers.parentOfferId + offers.negotiationRound for counter-offer chain.
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [cols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'offers'",
  );
  const has = new Set(cols.map((r) => r.COLUMN_NAME));
  const adds = [];
  if (!has.has('parentOfferId')) adds.push("ADD COLUMN `parentOfferId` VARCHAR(36) NULL");
  if (!has.has('negotiationRound')) adds.push("ADD COLUMN `negotiationRound` INT NOT NULL DEFAULT 0");
  if (adds.length === 0) {
    console.log('[ddl] columns already exist — noop');
  } else {
    await c.query(`ALTER TABLE \`offers\` ${adds.join(', ')}`);
    console.log(`[ddl] added: ${adds.join(' | ')}`);
  }
  // Index parentOfferId for chain lookups
  const [idx] = await c.query(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'offers' AND INDEX_NAME = 'IDX_offers_parentOfferId'",
  );
  if (idx.length === 0) {
    await c.query("CREATE INDEX `IDX_offers_parentOfferId` ON `offers` (`parentOfferId`)");
    console.log('[ddl] created index IDX_offers_parentOfferId');
  }
  await c.end();
})().catch((e) => { console.error('[err]', e.code, e.message); process.exit(1); });
