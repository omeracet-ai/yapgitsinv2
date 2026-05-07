// One-shot DDL to add Airtasker-style badge columns to users table.
// Idempotent: skips if columns already exist.
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
  console.log(`[ddl] connected to ${process.env.DB_USERNAME}@${process.env.DB_HOST}/${process.env.DB_NAME}`);

  const [cols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
  );
  const existing = new Set(cols.map((r) => r.COLUMN_NAME));

  const adds = [
    { name: 'badges',              ddl: "ADD COLUMN `badges` LONGTEXT NULL" },
    { name: 'responseTimeMinutes', ddl: "ADD COLUMN `responseTimeMinutes` INT NULL" },
  ];
  const todo = adds.filter((a) => !existing.has(a.name));
  if (todo.length === 0) {
    console.log('[ddl] all columns already present — nothing to do');
  } else {
    const sql = `ALTER TABLE \`users\` ${todo.map((a) => a.ddl).join(', ')}`;
    console.log(`[ddl] ${sql}`);
    await c.query(sql);
    console.log(`[ddl] added: ${todo.map((a) => a.name).join(', ')}`);
  }
  await c.end();
})().catch((e) => { console.error('[err]', e.code, e.message); process.exit(1); });
