#!/usr/bin/env node
/**
 * Phase 173 — Backfill Bayesian averageRating + wilsonScore for existing users.
 *
 * Usage:
 *   node scripts/backfill-wilson.js [path/to/hizmet_db.sqlite]
 *
 * For each user with totalReviews > 0:
 *   - Recompute sum(rating), count(*), positive(rating>=4) from reviews table
 *   - Apply bayesianAverage(C=10, m=4.0) → averageRating
 *   - Apply wilsonScore(95% CI) → wilsonScore
 *   - Recompute reputationScore = round(bayesian × 20) + (success_total) × 5
 */
const path = require('path');
const Database = require('better-sqlite3');

const C = 10;
const M = 4.0;
const Z = 1.96;

function bayesian(sum, count) {
  const denom = C + count;
  return denom > 0 ? (C * M + sum) / denom : M;
}
function wilson(positive, total) {
  if (total <= 0) return 0;
  const p = positive / total;
  const z2 = Z * Z;
  const num = p + z2 / (2 * total) - Z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return num / (1 + z2 / total);
}

const dbPath =
  process.argv[2] || path.resolve(__dirname, '../nestjs-backend/hizmet_db.sqlite');
console.log(`[wilson-backfill] DB: ${dbPath}`);

const db = new Database(dbPath);
const users = db.prepare('SELECT id, asCustomerSuccess, asWorkerSuccess FROM users').all();
const stmt = db.prepare(`
  UPDATE users
  SET averageRating = ?, wilsonScore = ?, totalReviews = ?, reputationScore = ?
  WHERE id = ?
`);

let updated = 0;
const tx = db.transaction(() => {
  for (const u of users) {
    const rows = db.prepare('SELECT rating FROM reviews WHERE revieweeId = ?').all(u.id);
    const total = rows.length;
    let sum = 0;
    let positive = 0;
    for (const r of rows) {
      sum += r.rating;
      if (r.rating >= 4) positive++;
    }
    const avg = bayesian(sum, total);
    const wil = wilson(positive, total);
    const rep =
      Math.round(avg * 20) + ((u.asCustomerSuccess || 0) + (u.asWorkerSuccess || 0)) * 5;
    stmt.run(
      Math.round(avg * 100) / 100,
      Math.round(wil * 10000) / 10000,
      total,
      rep,
      u.id,
    );
    updated++;
  }
});
tx();

console.log(`[wilson-backfill] Updated ${updated} users.`);
db.close();
