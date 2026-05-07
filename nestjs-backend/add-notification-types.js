/**
 * add-notification-types.js
 *
 * Verification script for the expanded NotificationType enum.
 *
 * The `notifications.type` column is mapped via TypeORM `simple-enum`, which
 * on SQLite/MariaDB is stored as a plain VARCHAR/TEXT (no DB-level CHECK
 * constraint with the enum values pinned). That means adding new enum
 * variants (counter_offer, offer_expired, dispute_opened, dispute_resolved,
 * job_pending_completion, job_completed, job_cancelled, review_reminder)
 * requires NO DDL change — INSERTs with the new values just work.
 *
 * This script connects to the SQLite DB, confirms the `notifications` table
 * and `type` column exist, prints the existing distinct type values, and
 * exits. No mutations are performed.
 *
 * Usage:
 *   cd nestjs-backend && node add-notification-types.js
 */
const path = require('path');
const fs = require('fs');

const NEW_TYPES = [
  'counter_offer',
  'offer_expired',
  'dispute_opened',
  'dispute_resolved',
  'job_pending_completion',
  'job_completed',
  'job_cancelled',
  'review_reminder',
];

function main() {
  const dbPath = path.resolve(__dirname, 'hizmet_db.sqlite');
  console.log(`[migrate] DB path: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.log('[migrate] SQLite DB not found — nothing to verify.');
    console.log('[migrate] On first NestJS boot the schema will sync automatically.');
    console.log('[migrate] simple-enum is stored as VARCHAR — new types require no DDL.');
    return;
  }

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    console.log('[migrate] better-sqlite3 not installed — skipping live verification.');
    console.log('[migrate] Note: simple-enum is stored as VARCHAR — adding new enum values is a code-only change.');
    console.log(`[migrate] New types added to NotificationType: ${NEW_TYPES.join(', ')}`);
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")
      .all();
    if (tables.length === 0) {
      console.log('[migrate] notifications table does not exist yet (schema will be created on next boot).');
      return;
    }

    const cols = db.prepare("PRAGMA table_info('notifications')").all();
    const typeCol = cols.find((c) => c.name === 'type');
    if (!typeCol) {
      console.error('[migrate] ERROR: notifications.type column missing!');
      process.exit(1);
    }
    console.log(`[migrate] notifications.type column OK (declared type: ${typeCol.type}).`);
    console.log('[migrate] simple-enum stored as VARCHAR — no DDL change required.');

    const existing = db
      .prepare('SELECT DISTINCT type FROM notifications ORDER BY type')
      .all()
      .map((r) => r.type);
    console.log(`[migrate] Existing distinct type values in DB: ${existing.length === 0 ? '(none)' : existing.join(', ')}`);
    console.log(`[migrate] New types added by this release: ${NEW_TYPES.join(', ')}`);
    console.log('[migrate] No schema modification performed. Safe to deploy.');
  } finally {
    db.close();
  }
}

try {
  main();
} catch (err) {
  console.error('[migrate] Verification failed:', err.message);
  process.exit(1);
}
