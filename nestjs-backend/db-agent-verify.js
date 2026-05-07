// DB-Agent Task 1: Post-migration verification
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

  async function colExists(table, col) {
    const [r] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?`,
      [db, table, col]
    );
    return r[0] || null;
  }
  async function tableExists(t) {
    const [r] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?`,
      [db, t]
    );
    return !!r[0];
  }
  async function indexOn(table, col) {
    const [r] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?`,
      [db, table, col]
    );
    return r.map(x => x.INDEX_NAME);
  }

  const checks = [
    ['users', 'badges'],
    ['users', 'responseTimeMinutes'],
    ['users', 'workerSkills'],
    ['chat_messages', 'jobId'],
    ['chat_messages', 'bookingId'],
    ['offers', 'attachmentUrls'],
    ['offers', 'parentOfferId'],
    ['offers', 'negotiationRound'],
  ];
  console.log('\n=== Task 1: Column verification ===');
  for (const [t, c] of checks) {
    const info = await colExists(t, c);
    const idx = await indexOn(t, c);
    console.log(`${info ? 'OK' : 'MISSING'}  ${t}.${c}` +
      (info ? ` (${info.COLUMN_TYPE})` : '') +
      (idx.length ? ` [idx: ${idx.join(',')}]` : ''));
  }

  console.log('\n=== Task 1: Tables ===');
  for (const t of ['favorite_providers', 'saved_job_searches']) {
    const ok = await tableExists(t);
    console.log(`${ok ? 'OK' : 'MISSING'}  ${t}`);
    if (ok) {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
        [db, t]
      );
      console.log('  columns:', cols.map(c => `${c.COLUMN_NAME}:${c.COLUMN_TYPE}${c.IS_NULLABLE==='NO'?' NN':''}${c.COLUMN_KEY?' '+c.COLUMN_KEY:''}`).join(', '));
    }
  }

  console.log('\n=== Task 3: Index audit ===');
  const auditTables = ['jobs', 'offers', 'users', 'chat_messages'];
  for (const t of auditTables) {
    const [idx] = await conn.query(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [db, t]
    );
    console.log(`-- ${t} --`);
    const grouped = {};
    for (const i of idx) {
      grouped[i.INDEX_NAME] ??= [];
      grouped[i.INDEX_NAME].push(i.COLUMN_NAME);
    }
    for (const [name, cols] of Object.entries(grouped)) {
      console.log(`  ${name}: (${cols.join(',')})`);
    }
  }

  console.log('\n=== Hot-path coverage check ===');
  const hot = [
    ['jobs', 'customerId'],
    ['jobs', 'status'],
    ['offers', 'jobId'],
    ['offers', 'userId'],
    ['chat_messages', 'from'],
    ['chat_messages', 'to'],
    ['users', 'email'],
    ['users', 'phoneNumber'],
  ];
  for (const [t, c] of hot) {
    const idx = await indexOn(t, c);
    console.log(`${idx.length ? 'OK' : 'MISSING'}  ${t}.${c}${idx.length ? ' [' + idx.join(',') + ']' : ''}`);
  }

  await conn.end();
})().catch(e => { console.error('ERR', e.code, e.message); process.exit(1); });
