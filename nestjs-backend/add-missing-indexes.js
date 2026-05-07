// DB-Agent Task 3: add missing indexes idempotently for hot query paths
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

  async function indexCovers(table, column) {
    // True if any index has this column at SEQ_IN_INDEX = 1
    const [r] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? AND SEQ_IN_INDEX=1`,
      [db, table, column]
    );
    return r.map(x => x.INDEX_NAME);
  }

  const targets = [
    { table: 'jobs',          column: 'status',      name: 'IDX_jobs_status' },
    { table: 'chat_messages', column: 'from',        name: 'IDX_chat_messages_from' },
    { table: 'chat_messages', column: 'to',          name: 'IDX_chat_messages_to' },
    // Add others if not covered (defensive — most are FK-covered already)
    { table: 'jobs',          column: 'customerId',  name: 'IDX_jobs_customerId' },
    { table: 'offers',        column: 'jobId',       name: 'IDX_offers_jobId' },
    { table: 'offers',        column: 'userId',      name: 'IDX_offers_userId' },
    { table: 'users',         column: 'email',       name: 'IDX_users_email' },
    { table: 'users',         column: 'phoneNumber', name: 'IDX_users_phoneNumber' },
  ];

  for (const t of targets) {
    const covering = await indexCovers(t.table, t.column);
    if (covering.length) {
      console.log(`SKIP  ${t.table}.${t.column} (covered by [${covering.join(',')}])`);
      continue;
    }
    console.log(`ADD   index ${t.name} on ${t.table}(${t.column})`);
    await conn.query(`CREATE INDEX \`${t.name}\` ON \`${t.table}\` (\`${t.column}\`)`);
  }

  // Final state
  console.log('\nIndex state on hot tables:');
  for (const tbl of ['jobs', 'offers', 'users', 'chat_messages']) {
    const [idx] = await conn.query(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
       GROUP BY INDEX_NAME ORDER BY INDEX_NAME`,
      [db, tbl]
    );
    console.log(`-- ${tbl} --`);
    for (const i of idx) console.log(`  ${i.INDEX_NAME}: (${i.cols})`);
  }

  await conn.end();
})().catch(e => { console.error('ERR', e.code, e.message); process.exit(1); });
