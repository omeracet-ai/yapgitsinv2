// One-shot DDL: add offers.attachmentUrls (JSON) for Airtasker-style portfolio uploads.
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
  if (has.has('attachmentUrls')) {
    console.log('[ddl] offers.attachmentUrls already exists — noop');
  } else {
    await c.query("ALTER TABLE `offers` ADD COLUMN `attachmentUrls` LONGTEXT NULL");
    console.log('[ddl] added offers.attachmentUrls');
  }
  await c.end();
})().catch((e) => { console.error('[err]', e.code, e.message); process.exit(1); });
