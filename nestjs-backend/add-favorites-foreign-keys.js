// DB-Agent Task 2: add missing FK constraints idempotently
// favorite_providers.userId    -> users.id (CASCADE)
// favorite_providers.providerId-> users.id (CASCADE)
// saved_job_searches.userId    -> users.id (CASCADE)
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

  async function fkExists(table, column) {
    const [r] = await conn.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [db, table, column]
    );
    return r[0]?.CONSTRAINT_NAME || null;
  }

  async function indexExistsOn(table, column) {
    const [r] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? AND SEQ_IN_INDEX=1`,
      [db, table, column]
    );
    return !!r[0];
  }

  const targets = [
    { table: 'favorite_providers', col: 'userId',     ref: 'users', refCol: 'id', name: 'FK_favorite_providers_userId' },
    { table: 'favorite_providers', col: 'providerId', ref: 'users', refCol: 'id', name: 'FK_favorite_providers_providerId' },
    { table: 'saved_job_searches', col: 'userId',     ref: 'users', refCol: 'id', name: 'FK_saved_job_searches_userId' },
  ];

  for (const t of targets) {
    const existing = await fkExists(t.table, t.col);
    if (existing) {
      console.log(`SKIP  ${t.table}.${t.col} -> ${t.ref}.${t.refCol} (FK ${existing} already exists)`);
      continue;
    }
    // Ensure index exists (FK requires one); MySQL/Maria auto-creates if missing, but be explicit
    if (!(await indexExistsOn(t.table, t.col))) {
      const idxName = `IDX_${t.table}_${t.col}`;
      console.log(`ADD   index ${idxName} on ${t.table}(${t.col})`);
      await conn.query(`CREATE INDEX \`${idxName}\` ON \`${t.table}\` (\`${t.col}\`)`);
    }
    const sql =
      `ALTER TABLE \`${t.table}\` ADD CONSTRAINT \`${t.name}\` ` +
      `FOREIGN KEY (\`${t.col}\`) REFERENCES \`${t.ref}\`(\`${t.refCol}\`) ` +
      `ON DELETE CASCADE ON UPDATE CASCADE`;
    console.log(`ADD   ${t.table}.${t.col} -> ${t.ref}.${t.refCol} CASCADE`);
    await conn.query(sql);
  }

  // Verify
  console.log('\nFinal FK state:');
  const [fks] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('favorite_providers','saved_job_searches')
       AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, COLUMN_NAME`,
    [db]
  );
  for (const f of fks) console.log(`  ${f.TABLE_NAME}.${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME} (${f.CONSTRAINT_NAME})`);

  await conn.end();
})().catch(e => { console.error('ERR', e.code, e.message); process.exit(1); });
