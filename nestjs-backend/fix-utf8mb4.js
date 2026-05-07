// Convert database + every table to utf8mb4 so emoji + 4-byte chars survive.
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
  const db = process.env.DB_NAME;
  console.log(`[utf8mb4] altering ${db}`);

  await c.query(`ALTER DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const [tables] = await c.query('SHOW TABLES');
  for (const r of tables) {
    const t = Object.values(r)[0];
    await c.query(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('  +', t);
  }
  await c.end();
  console.log('[done]');
})().catch(e => { console.error('[err]', e.code, e.message); process.exit(1); });
