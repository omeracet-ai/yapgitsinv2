// Drop every table in the target MySQL database. Idempotent.
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  console.log(`[drop] connected to ${process.env.DB_USERNAME}@${process.env.DB_HOST}/${process.env.DB_NAME}`);
  const [tables] = await conn.query('SHOW TABLES');
  if (tables.length === 0) { console.log('[drop] no tables'); await conn.end(); return; }
  const names = tables.map(r => Object.values(r)[0]);
  console.log(`[drop] dropping ${names.length}: ${names.join(', ')}`);
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of names) await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  const [check] = await conn.query('SHOW TABLES');
  console.log(`[drop] done. remaining tables: ${check.length}`);
  await conn.end();
})().catch(e => { console.error('[err]', e.code || '', e.message); process.exit(1); });
