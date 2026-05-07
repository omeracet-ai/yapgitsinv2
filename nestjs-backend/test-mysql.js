// Standalone MySQL connection probe — uses .env.production by default.
// Usage: node test-mysql.js [host-override]
//   e.g. node test-mysql.js ftp.yapgitsin.tr   (remote test from dev machine)
//        node test-mysql.js                    (uses DB_HOST from .env.production)
require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

(async () => {
  const cfg = {
    host: process.argv[2] || process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
  };
  console.log(`[test] connecting to ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);
  try {
    const conn = await mysql.createConnection(cfg);
    const [info] = await conn.query('SELECT VERSION() AS v, NOW() AS now, DATABASE() AS db, @@hostname AS host');
    console.log('[ok] connected:', info[0]);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`[ok] tables (${tables.length}):`, tables.map(t => Object.values(t)[0]).join(', ') || '(empty)');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[err]', err.code || '', err.message);
    process.exit(1);
  }
})();
