/* eslint-disable */
// Idempotent DDL: adds saved_job_searches.lastNotifiedAt DATETIME NULL on production MariaDB.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });
require('dotenv').config({ path: path.join(__dirname, '.env.production.local'), override: true });
const mysql = require('mysql2/promise');

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

    const [tables] = await conn.query("SHOW TABLES LIKE 'saved_job_searches'");
    if (tables.length === 0) {
      console.log('[skip] saved_job_searches table does not exist yet');
      process.exit(0);
    }

    const [cols] = await conn.query("SHOW COLUMNS FROM saved_job_searches LIKE 'lastNotifiedAt'");
    if (cols.length > 0) {
      console.log('[ok] skipped (exists)');
      process.exit(0);
    }

    await conn.query('ALTER TABLE saved_job_searches ADD COLUMN lastNotifiedAt DATETIME NULL');
    console.log('[ok] lastNotifiedAt added');
    process.exit(0);
  } catch (err) {
    console.error('[err]', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
})();
