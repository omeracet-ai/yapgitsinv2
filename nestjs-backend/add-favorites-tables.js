// One-shot DDL: create favorite_providers + saved_job_searches tables.
// Idempotent — checks information_schema.TABLES before creating.
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

  const [tables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const has = new Set(tables.map((r) => r.TABLE_NAME));

  if (has.has('favorite_providers')) {
    console.log('[ddl] favorite_providers already exists — noop');
  } else {
    await c.query(`
      CREATE TABLE \`favorite_providers\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`providerId\` varchar(36) NOT NULL,
        \`notes\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_favorite_user_provider\` (\`userId\`, \`providerId\`),
        KEY \`IDX_favorite_userId\` (\`userId\`),
        KEY \`IDX_favorite_providerId\` (\`providerId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[ddl] created favorite_providers');
  }

  if (has.has('saved_job_searches')) {
    console.log('[ddl] saved_job_searches already exists — noop');
  } else {
    await c.query(`
      CREATE TABLE \`saved_job_searches\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`criteria\` longtext NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_saved_search_userId\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[ddl] created saved_job_searches');
  }

  await c.end();
})().catch((e) => {
  console.error('[err]', e.code, e.message);
  process.exit(1);
});
