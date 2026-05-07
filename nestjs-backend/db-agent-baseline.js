// DB-Agent baseline report — read-only inventory
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

  const [ver] = await conn.query('SELECT VERSION() AS v, DATABASE() AS db, @@character_set_database AS cs, @@collation_database AS coll');
  console.log('SERVER:', ver[0]);

  const [tables] = await conn.query(
    `SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION,
            ROUND((DATA_LENGTH+INDEX_LENGTH)/1024/1024,3) AS size_mb
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [cfg.database]
  );

  // Get accurate counts (TABLE_ROWS is approximate in InnoDB)
  const counts = {};
  for (const t of tables) {
    const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t.TABLE_NAME}\``);
    counts[t.TABLE_NAME] = r[0].c;
  }

  const [size] = await conn.query(
    `SELECT ROUND(SUM(DATA_LENGTH+INDEX_LENGTH)/1024/1024, 2) AS total_mb
     FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [cfg.database]
  );

  // FK list
  const [fks] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME`,
    [cfg.database]
  );

  // Collation drift
  const [collDrift] = await conn.query(
    `SELECT DISTINCT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [cfg.database]
  );

  console.log('\nTABLES:');
  console.log(JSON.stringify(tables.map(t => ({ name: t.TABLE_NAME, rows: counts[t.TABLE_NAME], engine: t.ENGINE, coll: t.TABLE_COLLATION, mb: t.size_mb })), null, 2));
  console.log('\nTOTAL_MB:', size[0].total_mb);
  console.log('\nFK_COUNT:', fks.length);
  console.log('FKS:', JSON.stringify(fks, null, 2));
  console.log('\nCOLLATIONS_PRESENT:', collDrift.map(c => c.TABLE_COLLATION));

  await conn.end();
})().catch(e => { console.error('ERR', e.code, e.message); process.exit(1); });
