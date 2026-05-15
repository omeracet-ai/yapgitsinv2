#!/usr/bin/env node
/**
 * Phase backfill — Plausible TR coordinates for jobs/users with NULL lat/lng.
 *
 * Usage:
 *   node scripts/backfill-coordinates.js            # apply
 *   node scripts/backfill-coordinates.js --dry-run  # count only
 */
const path = require('path');
const Module = require('module');
const backendNM = path.resolve(__dirname, '../nestjs-backend/node_modules');
if (!Module.globalPaths.includes(backendNM)) Module.globalPaths.push(backendNM);
const sqlite3 = require(path.join(backendNM, 'sqlite3'));

const DRY = process.argv.includes('--dry-run');
const dbPath = path.resolve(__dirname, '../nestjs-backend/hizmet_db.sqlite');

// TR city centers (lat, lng)
const CITIES = [
  ['Istanbul', 41.0082, 28.9784],
  ['Ankara',   39.9334, 32.8597],
  ['Izmir',    38.4192, 27.1287],
  ['Bursa',    40.1828, 29.0665],
  ['Antalya',  36.8969, 30.7133],
  ['Adana',    37.0000, 35.3213],
  ['Konya',    37.8746, 32.4932],
];
const JITTER = 0.05; // ~5 km

function pickCoord() {
  const c = CITIES[Math.floor(Math.random() * CITIES.length)];
  const lat = c[1] + (Math.random() * 2 - 1) * JITTER;
  const lng = c[2] + (Math.random() * 2 - 1) * JITTER;
  return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6];
}

function run(db, sql, params = []) {
  return new Promise((res, rej) =>
    db.run(sql, params, function (err) { err ? rej(err) : res(this); })
  );
}
function all(db, sql, params = []) {
  return new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows)))
  );
}
function get(db, sql, params = []) {
  return new Promise((res, rej) =>
    db.get(sql, params, (err, row) => (err ? rej(err) : res(row)))
  );
}

(async () => {
  console.log(`[backfill-coords] DB: ${dbPath} | mode: ${DRY ? 'DRY-RUN' : 'APPLY'}`);
  const db = new sqlite3.Database(dbPath);

  const jobs = await all(db, 'SELECT id FROM jobs WHERE latitude IS NULL OR longitude IS NULL');
  const users = await all(db, 'SELECT id FROM users WHERE latitude IS NULL OR longitude IS NULL');
  console.log(`[backfill-coords] NULL jobs=${jobs.length}, NULL users=${users.length}`);

  if (!DRY) {
    await run(db, 'BEGIN');
    try {
      let jUpd = 0, uUpd = 0;
      for (const j of jobs) {
        const [lat, lng] = pickCoord();
        await run(db, 'UPDATE jobs SET latitude=?, longitude=? WHERE id=?', [lat, lng, j.id]);
        jUpd++;
      }
      for (const u of users) {
        const [lat, lng] = pickCoord();
        await run(db, 'UPDATE users SET latitude=?, longitude=?, lastLocationAt=? WHERE id=?',
          [lat, lng, new Date().toISOString(), u.id]);
        uUpd++;
      }
      await run(db, 'COMMIT');
      console.log(`[backfill-coords] APPLIED: ${jUpd} jobs, ${uUpd} users`);
    } catch (e) {
      await run(db, 'ROLLBACK');
      throw e;
    }
  }

  const jTotal = await get(db, 'SELECT COUNT(*) c FROM jobs WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
  const uTotal = await get(db, 'SELECT COUNT(*) c FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
  console.log(`[backfill-coords] VERIFY: jobs_with_coords=${jTotal.c}, users_with_coords=${uTotal.c}`);

  db.close();
})().catch(e => { console.error(e); process.exit(1); });
