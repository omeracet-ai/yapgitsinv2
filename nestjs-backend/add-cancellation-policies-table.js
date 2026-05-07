// One-shot DDL: create cancellation_policies table.
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

  if (has.has('cancellation_policies')) {
    console.log('[ddl] cancellation_policies already exists — noop');
  } else {
    await c.query(`
      CREATE TABLE IF NOT EXISTS \`cancellation_policies\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`appliesTo\` ENUM('customer_cancel','tasker_cancel','mutual_cancel','dispute_resolved_customer','dispute_resolved_tasker') NOT NULL,
        \`appliesAtStage\` ENUM('before_assignment','after_assignment','in_progress','pending_completion','any') NOT NULL DEFAULT 'any',
        \`minHoursElapsed\` INT NOT NULL DEFAULT 0,
        \`maxHoursElapsed\` INT NULL,
        \`refundPercentage\` FLOAT NOT NULL DEFAULT 0,
        \`taskerCompensationPercentage\` FLOAT NOT NULL DEFAULT 0,
        \`platformFeePercentage\` FLOAT NOT NULL DEFAULT 0,
        \`priority\` INT NOT NULL DEFAULT 100,
        \`isActive\` BOOLEAN NOT NULL DEFAULT 1,
        \`description\` TEXT NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY \`IDX_cancellation_policies_appliesTo\` (\`appliesTo\`),
        KEY \`IDX_cancellation_policies_appliesAtStage\` (\`appliesAtStage\`),
        KEY \`IDX_cancellation_policies_isActive\` (\`isActive\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [idx] = await c.query(
      "SELECT COUNT(DISTINCT INDEX_NAME) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cancellation_policies'",
    );
    console.log(`[ddl] created cancellation_policies with ${idx[0].n} indexes`);
  }

  const [describe] = await c.query('DESCRIBE cancellation_policies');
  console.log('[ddl] DESCRIBE cancellation_policies:');
  console.log(JSON.stringify(describe, null, 2));

  const [indexes] = await c.query(
    "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cancellation_policies'",
  );
  console.log(`[ddl] indexes (${indexes.length}):`, indexes.map(r => r.INDEX_NAME).join(', '));

  const [rowCount] = await c.query('SELECT COUNT(*) AS n FROM cancellation_policies');
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
