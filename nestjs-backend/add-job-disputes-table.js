// One-shot DDL: create job_disputes table.
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

  const [beforeTables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const has = new Set(beforeTables.map((r) => r.TABLE_NAME));
  console.log(`[ddl] tables before: ${beforeTables.length}`);

  if (has.has('job_disputes')) {
    console.log('[ddl] job_disputes already exists — noop');
  } else {
    await c.query(`
      CREATE TABLE IF NOT EXISTS \`job_disputes\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`jobId\` VARCHAR(36) NOT NULL,
        \`raisedByUserId\` VARCHAR(36) NOT NULL,
        \`counterPartyUserId\` VARCHAR(36) NOT NULL,
        \`escrowId\` VARCHAR(36) NULL,
        \`disputeType\` ENUM('quality','payment','non_delivery','incomplete','other') NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`evidenceUrls\` LONGTEXT NULL,
        \`resolutionStatus\` ENUM('open','under_review','resolved_customer','resolved_tasker','resolved_split','dismissed') NOT NULL DEFAULT 'open',
        \`resolutionNotes\` TEXT NULL,
        \`resolvedByAdminId\` VARCHAR(36) NULL,
        \`refundAmount\` FLOAT NULL,
        \`taskerCompensationAmount\` FLOAT NULL,
        \`raisedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`resolvedAt\` DATETIME(6) NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY \`IDX_job_disputes_jobId\` (\`jobId\`),
        KEY \`IDX_job_disputes_raisedByUserId\` (\`raisedByUserId\`),
        KEY \`IDX_job_disputes_counterPartyUserId\` (\`counterPartyUserId\`),
        KEY \`IDX_job_disputes_escrowId\` (\`escrowId\`),
        KEY \`IDX_job_disputes_resolutionStatus\` (\`resolutionStatus\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [idx] = await c.query(
      "SELECT COUNT(DISTINCT INDEX_NAME) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_disputes'",
    );
    console.log(`[ddl] created job_disputes with ${idx[0].n} indexes`);
  }

  const [describe] = await c.query('DESCRIBE job_disputes');
  console.log('[ddl] DESCRIBE job_disputes:');
  console.log(JSON.stringify(describe, null, 2));

  const [indexes] = await c.query(
    "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_disputes'",
  );
  console.log(`[ddl] indexes (${indexes.length}):`, indexes.map(r => r.INDEX_NAME).join(', '));

  const [rowCount] = await c.query('SELECT COUNT(*) AS n FROM job_disputes');
  console.log(`[ddl] row count: ${rowCount[0].n}`);

  const [afterTables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  console.log(`[ddl] tables after: ${afterTables.length}`);

  await c.end();
})().catch((e) => {
  console.error('[err]', e.code, e.message);
  process.exit(1);
});
