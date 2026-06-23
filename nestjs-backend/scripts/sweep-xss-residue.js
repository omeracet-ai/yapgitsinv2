/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Phase 519 — XSS residue sweep.
 *
 * Usage:
 *   node scripts/sweep-xss-residue.js          # dry-run (list only)
 *   node scripts/sweep-xss-residue.js --apply  # sanitize + update
 *
 * Hedef: prod SQLite — jobs.title/description, service_requests.title/description,
 * users.workerBio, reviews.comment, offers.message/counterMessage, bookings.description,
 * chat_messages.message. Mevcut HTML/script payload'larını tag-strip eder.
 */
const path = require('path');
const sqlite3 = require('sqlite3');
const sanitizeHtml = require('sanitize-html');

const DB_PATH =
  process.env.DB_PATH ||
  path.resolve(__dirname, '..', 'hizmet_db.sqlite');
const APPLY = process.argv.includes('--apply');

const TARGETS = [
  { table: 'jobs', cols: ['title', 'description', 'location'] },
  { table: 'service_requests', cols: ['title', 'description', 'address', 'location'] },
  { table: 'users', cols: ['workerBio', 'fullName', 'address', 'city', 'district'] },
  { table: 'reviews', cols: ['comment'] },
  { table: 'offers', cols: ['message', 'counterMessage'] },
  { table: 'bookings', cols: ['description', 'address', 'workerNote', 'customerNote'] },
  { table: 'chat_messages', cols: ['message'] },
  { table: 'job_questions', cols: ['text'] },
  { table: 'job_question_replies', cols: ['text'] },
];

const OPTS = { allowedTags: [], allowedAttributes: {} };

function sanitize(s) {
  if (typeof s !== 'string') return s;
  return sanitizeHtml(s, OPTS);
}

function looksRisky(s) {
  return typeof s === 'string' && /<[^>]+>/.test(s);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('DB open hatası:', err.message, 'path=', DB_PATH);
    process.exit(1);
  }
});

async function scanTable(t) {
  return new Promise((resolve) => {
    const cols = ['id', ...t.cols].join(', ');
    db.all(
      `SELECT ${cols} FROM ${t.table} WHERE ${t.cols
        .map((c) => `${c} LIKE '%<%'`)
        .join(' OR ')}`,
      [],
      (err, rows) => {
        if (err) {
          console.warn(`! ${t.table} skip: ${err.message}`);
          return resolve(0);
        }
        let touched = 0;
        for (const row of rows || []) {
          const updates = {};
          for (const c of t.cols) {
            if (looksRisky(row[c])) {
              const cleaned = sanitize(row[c]);
              if (cleaned !== row[c]) updates[c] = cleaned;
            }
          }
          if (Object.keys(updates).length === 0) continue;
          touched++;
          console.log(`> ${t.table}#${row.id}`);
          for (const k of Object.keys(updates)) {
            console.log(`   ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(updates[k])}`);
          }
          if (APPLY) {
            const sets = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
            const vals = [...Object.values(updates), row.id];
            db.run(`UPDATE ${t.table} SET ${sets} WHERE id = ?`, vals, (e) => {
              if (e) console.warn(`  ! UPDATE fail: ${e.message}`);
            });
          }
        }
        console.log(`= ${t.table}: ${touched} satır ${APPLY ? 'temizlendi' : '(dry-run)'}`);
        resolve(touched);
      },
    );
  });
}

(async () => {
  console.log(`DB: ${DB_PATH}`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  let total = 0;
  for (const t of TARGETS) total += await scanTable(t);
  console.log(`Toplam: ${total} satır`);
  db.close();
})();
