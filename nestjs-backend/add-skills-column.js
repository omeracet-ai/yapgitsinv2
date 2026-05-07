// One-shot DDL: add users.workerSkills (JSON tags) for Airtasker-style skills.
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
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
  );
  const has = new Set(cols.map((r) => r.COLUMN_NAME));
  if (has.has('workerSkills')) {
    console.log('[ddl] workerSkills already exists — noop');
  } else {
    await c.query("ALTER TABLE `users` ADD COLUMN `workerSkills` LONGTEXT NULL");
    console.log('[ddl] added workerSkills');
  }
  await c.end();
})().catch((e) => { console.error('[err]', e.code, e.message); process.exit(1); });
