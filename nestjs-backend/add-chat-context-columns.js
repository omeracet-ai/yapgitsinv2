// One-shot DDL: add chat_messages.jobId / .bookingId for Airtasker-style task-scoped chat.
// Idempotent — checks information_schema before altering.
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
  const [cols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages'",
  );
  const has = new Set(cols.map((r) => r.COLUMN_NAME));

  if (has.has('jobId')) {
    console.log('[ddl] chat_messages.jobId already exists — noop');
  } else {
    await c.query(
      "ALTER TABLE `chat_messages` ADD COLUMN `jobId` VARCHAR(36) NULL",
    );
    console.log('[ddl] added chat_messages.jobId');
  }

  if (has.has('bookingId')) {
    console.log('[ddl] chat_messages.bookingId already exists — noop');
  } else {
    await c.query(
      "ALTER TABLE `chat_messages` ADD COLUMN `bookingId` VARCHAR(36) NULL",
    );
    console.log('[ddl] added chat_messages.bookingId');
  }

  // Indexes (best-effort; ignore if already there).
  const [idx] = await c.query(
    "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages'",
  );
  const idxNames = new Set(idx.map((r) => r.INDEX_NAME));
  if (!idxNames.has('IDX_chat_messages_jobId')) {
    try {
      await c.query(
        "CREATE INDEX `IDX_chat_messages_jobId` ON `chat_messages` (`jobId`)",
      );
      console.log('[ddl] created index IDX_chat_messages_jobId');
    } catch (e) {
      console.log('[ddl] index jobId skipped:', e.code || e.message);
    }
  }
  if (!idxNames.has('IDX_chat_messages_bookingId')) {
    try {
      await c.query(
        "CREATE INDEX `IDX_chat_messages_bookingId` ON `chat_messages` (`bookingId`)",
      );
      console.log('[ddl] created index IDX_chat_messages_bookingId');
    } catch (e) {
      console.log('[ddl] index bookingId skipped:', e.code || e.message);
    }
  }

  await c.end();
})().catch((e) => {
  console.error('[err]', e.code, e.message);
  process.exit(1);
});
