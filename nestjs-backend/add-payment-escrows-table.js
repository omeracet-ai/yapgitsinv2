// One-shot DDL: create payment_escrows table.
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

  if (has.has('payment_escrows')) {
    console.log('[ddl] payment_escrows already exists — noop');
  } else {
    await c.query(`
      CREATE TABLE IF NOT EXISTS \`payment_escrows\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`jobId\` VARCHAR(36) NOT NULL,
        \`offerId\` VARCHAR(36) NOT NULL,
        \`customerId\` VARCHAR(36) NOT NULL,
        \`taskerId\` VARCHAR(36) NOT NULL,
        \`amount\` FLOAT NOT NULL,
        \`currency\` VARCHAR(3) NOT NULL DEFAULT 'TRY',
        \`status\` ENUM('held','released','refunded','disputed','partial_refund') NOT NULL DEFAULT 'held',
        \`paymentRef\` VARCHAR(100) NULL,
        \`refundAmount\` FLOAT NULL,
        \`releaseReason\` TEXT NULL,
        \`refundReason\` TEXT NULL,
        \`disputeReason\` TEXT NULL,
        \`heldAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`releasedAt\` DATETIME(6) NULL,
        \`refundedAt\` DATETIME(6) NULL,
        \`disputedAt\` DATETIME(6) NULL,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY \`IDX_payment_escrows_jobId\` (\`jobId\`),
        KEY \`IDX_payment_escrows_offerId\` (\`offerId\`),
        KEY \`IDX_payment_escrows_customerId\` (\`customerId\`),
        KEY \`IDX_payment_escrows_taskerId\` (\`taskerId\`),
        KEY \`IDX_payment_escrows_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [idx] = await c.query(
      "SELECT COUNT(DISTINCT INDEX_NAME) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_escrows'",
    );
    console.log(`[ddl] created payment_escrows with ${idx[0].n} indexes`);
  }

  const [describe] = await c.query('DESCRIBE payment_escrows');
  console.log('[ddl] DESCRIBE payment_escrows:');
  console.log(JSON.stringify(describe, null, 2));

  const [afterTables] = await c.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  console.log(`[ddl] tables after: ${afterTables.length}`);

  await c.end();
})().catch((e) => {
  console.error('[err]', e.code, e.message);
  process.exit(1);
});
