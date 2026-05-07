// DB-Agent Tasks 4 + 6: drift check + final health snapshot
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const mysql = require('mysql2/promise');

(async () => {
  const cfg = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 15000,
  };
  const conn = await mysql.createConnection(cfg);
  const db = cfg.database;

  // Drift: engines and collations
  const [engRows] = await conn.query(
    `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`,
    [db]
  );
  const engines = new Set(engRows.map(r => r.ENGINE));
  const colls = new Set(engRows.map(r => r.TABLE_COLLATION));
  const drift = engRows.filter(r => r.ENGINE !== 'InnoDB' || r.TABLE_COLLATION !== 'utf8mb4_unicode_ci');

  console.log('=== Task 4: Schema drift ===');
  console.log('Engines present:', [...engines].join(', '));
  console.log('Collations present:', [...colls].join(', '));
  if (drift.length === 0) console.log('No drift — all tables InnoDB + utf8mb4_unicode_ci');
  else { console.log('DRIFT:'); for (const d of drift) console.log(`  ${d.TABLE_NAME}: ${d.ENGINE} / ${d.TABLE_COLLATION}`); }

  // Also check column-level collation drift
  const [colDrift] = await conn.query(
    `SELECT DISTINCT TABLE_NAME, COLUMN_NAME, COLLATION_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=? AND COLLATION_NAME IS NOT NULL AND COLLATION_NAME <> 'utf8mb4_unicode_ci'`,
    [db]
  );
  if (colDrift.length === 0) console.log('Column-level collation: uniform utf8mb4_unicode_ci');
  else { console.log('Column drift:'); for (const c of colDrift) console.log(`  ${c.TABLE_NAME}.${c.COLUMN_NAME}: ${c.COLLATION_NAME}`); }

  // Health snapshot
  console.log('\n=== Task 6: Health snapshot ===');
  let totalRows = 0;
  for (const t of engRows) {
    const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t.TABLE_NAME}\``);
    t._rows = r[0].c;
    totalRows += r[0].c;
  }
  const [size] = await conn.query(
    `SELECT ROUND(SUM(DATA_LENGTH+INDEX_LENGTH)/1024/1024, 3) AS mb
     FROM information_schema.TABLES WHERE TABLE_SCHEMA=?`,
    [db]
  );
  const [fkCount] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [db]
  );
  const [idxCount] = await conn.query(
    `SELECT COUNT(DISTINCT TABLE_NAME, INDEX_NAME) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA=?`,
    [db]
  );

  console.log(`Tables:       ${engRows.length}`);
  console.log(`Total rows:   ${totalRows}`);
  console.log(`Total size:   ${size[0].mb} MB`);
  console.log(`FK count:     ${fkCount[0].c}`);
  console.log(`Index count:  ${idxCount[0].c} (incl. PRIMARY)`);

  console.log('\nPer-table rows:');
  for (const t of engRows) console.log(`  ${t.TABLE_NAME.padEnd(34)} ${String(t._rows).padStart(6)}`);

  await conn.end();
})().catch(e => { console.error('ERR', e.code, e.message); process.exit(1); });
