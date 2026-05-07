// Genişlet notifications.type ENUM kolonunu — 9 eski değer + 8 yeni Airtasker değer.
// Müdüriye-3 simple-enum'un VARCHAR olduğunu varsaydı; aslında MariaDB native ENUM,
// yeni değerleri eklemek için MODIFY COLUMN şart.
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.production.local', override: true });
const mysql = require('mysql2/promise');

const ALL_TYPES = [
  'booking_request', 'booking_confirmed', 'booking_cancelled', 'booking_completed',
  'new_offer', 'offer_accepted', 'offer_rejected', 'new_review', 'system',
  // Airtasker eklenenler:
  'counter_offer', 'offer_expired', 'dispute_opened', 'dispute_resolved',
  'job_pending_completion', 'job_completed', 'job_cancelled', 'review_reminder',
];

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [cur] = await c.query("SHOW COLUMNS FROM notifications WHERE Field = 'type'");
  const enumStr = ALL_TYPES.map((t) => `'${t}'`).join(',');
  const ddl = `ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` ENUM(${enumStr}) NOT NULL DEFAULT 'system'`;
  console.log('[fix] current:', cur[0].Type.substring(0, 80) + '…');
  console.log('[fix] applying ALTER MODIFY (16 enum values)');
  await c.query(ddl);
  const [updated] = await c.query("SHOW COLUMNS FROM notifications WHERE Field = 'type'");
  console.log('[fix] new:', updated[0].Type.substring(0, 80) + '…');
  console.log('[done]');
  await c.end();
})().catch((e) => { console.error('[err]', e.code, e.message); process.exit(1); });
