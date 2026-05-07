// Copy data from hizmet_db.sqlite into the MySQL database created by NestJS.
// Strategy: read SQLite columns/rows for each table, then INSERT into MySQL using
// the same column names. Skips columns that don't exist on the MySQL side.
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');

// Order matters — parents first so FK constraints don't reject inserts.
const ORDER = [
  'users',
  'categories',
  'jobs',
  'offers',
  'service_requests',
  'service_request_applications',
  'bookings',
  'reviews',
  'notifications',
  'token_transactions',
  'job_questions',
  'job_question_replies',
  'providers',
  'chat_messages',
  'onboarding_slides',
];

function openSqlite(file) {
  return new Promise((res, rej) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, e => e ? rej(e) : res(db));
  });
}
const sqliteAll = (db, sql) => new Promise((res, rej) => db.all(sql, (e, rows) => e ? rej(e) : res(rows)));

(async () => {
  const sqlite = await openSqlite('hizmet_db.sqlite');
  const my = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });
  console.log(`[migrate] sqlite → mysql ${process.env.DB_USERNAME}@${process.env.DB_HOST}/${process.env.DB_NAME}`);

  await my.query('SET FOREIGN_KEY_CHECKS = 0');

  const summary = [];
  for (const table of ORDER) {
    // Discover MySQL columns
    let myCols;
    try {
      const [c] = await my.query(`SHOW COLUMNS FROM \`${table}\``);
      myCols = c.map(x => x.Field);
    } catch (e) {
      console.log(`[skip] ${table}: missing in mysql (${e.code})`);
      continue;
    }

    // Read sqlite rows
    let rows;
    try {
      rows = await sqliteAll(sqlite, `SELECT * FROM "${table}"`);
    } catch (e) {
      console.log(`[skip] ${table}: missing in sqlite`);
      continue;
    }

    if (rows.length === 0) {
      summary.push(`${table}: 0 (empty)`);
      continue;
    }

    // Intersect columns
    const sqliteCols = Object.keys(rows[0]);
    const cols = sqliteCols.filter(c => myCols.includes(c));
    if (cols.length === 0) {
      console.log(`[skip] ${table}: no overlapping columns`);
      continue;
    }

    const colsSql = cols.map(c => `\`${c}\``).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT IGNORE INTO \`${table}\` (${colsSql}) VALUES (${placeholders})`;

    let ok = 0, fail = 0;
    for (const row of rows) {
      const values = cols.map(c => row[c]);
      try {
        await my.query(insertSql, values);
        ok++;
      } catch (e) {
        fail++;
        if (fail <= 3) console.log(`  [warn] ${table} row failed: ${e.code} ${e.message}`);
      }
    }
    summary.push(`${table}: ${ok}/${rows.length}${fail ? ` (${fail} failed)` : ''}`);
  }

  await my.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\n[summary]');
  summary.forEach(s => console.log('  ' + s));

  sqlite.close();
  await my.end();
})().catch(e => { console.error('[err]', e); process.exit(1); });
