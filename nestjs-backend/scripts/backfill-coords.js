#!/usr/bin/env node
/**
 * Self-contained city-centroid coordinate backfill for jobs/users (SQLite).
 *
 * Plesk Node.js panel uyumlu: app root'tan (cwd) çalıştırılır.
 * Default DB path: <cwd>/hizmet_db.sqlite  (Plesk'te app root = D:\backend)
 *
 * Usage (Plesk Node.js > Run script):
 *   npm run backfill:coords:dry     -> dry-run (no writes)
 *   npm run backfill:coords:apply   -> commit changes
 *
 * Local (D:\Yapgitsinv2\nestjs-backend):
 *   node scripts/backfill-coords.js
 *   node scripts/backfill-coords.js --apply
 *   node scripts/backfill-coords.js --db=D:\backend\hizmet_db.sqlite --apply
 *
 * - Only writes verified TR city centroids (no jitter).
 * - Marks every row as approximate: location_approx=1, location_source='city_centroid:<key>'.
 * - Idempotent: ALTER TABLE only if columns missing.
 * - Unknown cities reported, never guessed.
 */
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');

// ---------- CLI ----------
function getArg(name) {
  const eq = process.argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/backfill-coords.js [--db=<path>] [--apply]

Options:
  --db=<path>      SQLite DB path (default: <cwd>/hizmet_db.sqlite)
                   Env: YAPGITSIN_DB_PATH or DB_PATH
  --apply          Actually write (default: dry-run)
  --help           Show this message
`);
  process.exit(0);
}

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;
const dbPath = getArg('db')
  || process.env.YAPGITSIN_DB_PATH
  || process.env.DB_PATH
  || path.resolve(process.cwd(), 'hizmet_db.sqlite');

console.log(`[backfill-coords] cwd: ${process.cwd()}`);
console.log(`[backfill-coords] dbPath: ${dbPath}`);
console.log(`[backfill-coords] Mode: ${DRY ? 'DRY-RUN' : 'APPLY'}`);

if (!fs.existsSync(dbPath)) {
  console.error(`[backfill-coords] DB file not found: ${dbPath}`);
  process.exit(1);
}

// ---------- City centroids ----------
const CITY_CENTROIDS = {
  istanbul:       [41.0082, 28.9784],
  ankara:         [39.9334, 32.8597],
  izmir:          [38.4192, 27.1287],
  bursa:          [40.1828, 29.0665],
  antalya:        [36.8969, 30.7133],
  adana:          [37.0000, 35.3213],
  konya:          [37.8746, 32.4932],
  gaziantep:      [37.0662, 37.3833],
  sanliurfa:      [37.1591, 38.7969],
  kocaeli:        [40.8533, 29.8815],
  mersin:         [36.8121, 34.6415],
  diyarbakir:     [37.9144, 40.2306],
  hatay:          [36.4018, 36.3498],
  manisa:         [38.6191, 27.4289],
  kayseri:        [38.7312, 35.4787],
  samsun:         [41.2867, 36.3300],
  balikesir:      [39.6484, 27.8826],
  kahramanmaras:  [37.5858, 36.9371],
  van:            [38.4942, 43.3800],
  aydin:          [37.8560, 27.8416],
  tekirdag:       [40.9833, 27.5167],
  sakarya:        [40.7569, 30.3781],
  denizli:        [37.7765, 29.0864],
  mugla:          [37.2153, 28.3636],
  eskisehir:      [39.7767, 30.5206],
  trabzon:        [41.0027, 39.7168],
  ordu:           [40.9839, 37.8764],
  afyonkarahisar: [38.7507, 30.5567],
  malatya:        [38.3552, 38.3095],
  erzurum:        [39.9043, 41.2679],
};

const ALIASES = {
  'afyon': 'afyonkarahisar',
  'maras': 'kahramanmaras',
  'kmaras': 'kahramanmaras',
  'urfa': 'sanliurfa',
  'k.maras': 'kahramanmaras',
  'istanbul-avrupa': 'istanbul',
  'istanbul-anadolu': 'istanbul',
};

function normalizeCity(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const first = raw.split(/[,/|]/)[0].trim();
  if (!first) return null;
  const map = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
  };
  let out = '';
  for (const ch of first) out += map[ch] !== undefined ? map[ch] : ch.toLowerCase();
  out = out.replace(/[^a-z0-9.\-]/g, '').trim();
  if (ALIASES[out]) out = ALIASES[out];
  return out || null;
}

function centroidFor(rawCity) {
  const key = normalizeCity(rawCity);
  if (!key) return { key: null, coords: null };
  const c = CITY_CENTROIDS[key];
  return { key, coords: c || null };
}

// ---------- sqlite3 helpers ----------
const run = (db, sql, p = []) => new Promise((res, rej) =>
  db.run(sql, p, function (e) { e ? rej(e) : res(this); }));
const all = (db, sql, p = []) => new Promise((res, rej) =>
  db.all(sql, p, (e, r) => e ? rej(e) : res(r)));
const get = (db, sql, p = []) => new Promise((res, rej) =>
  db.get(sql, p, (e, r) => e ? rej(e) : res(r)));

async function columnExists(db, table, col) {
  const rows = await all(db, `PRAGMA table_info(${table})`);
  return rows.some(r => r.name === col);
}

async function ensureSchema(db) {
  const changes = [];
  for (const table of ['jobs', 'users']) {
    if (!(await columnExists(db, table, 'location_approx'))) {
      await run(db, `ALTER TABLE ${table} ADD COLUMN location_approx INTEGER DEFAULT 0`);
      changes.push(`${table}.location_approx ADDED`);
    } else {
      changes.push(`${table}.location_approx exists`);
    }
    if (!(await columnExists(db, table, 'location_source'))) {
      await run(db, `ALTER TABLE ${table} ADD COLUMN location_source TEXT`);
      changes.push(`${table}.location_source ADDED`);
    } else {
      changes.push(`${table}.location_source exists`);
    }
  }
  return changes;
}

const MISSING_COORD = '(latitude IS NULL OR longitude IS NULL OR (latitude = 0 AND longitude = 0))';

async function processTable(db, { table, cityCol, extraSet }) {
  const rows = await all(db,
    `SELECT id, ${cityCol} AS city FROM ${table} WHERE ${MISSING_COORD}`);
  const unknown = new Map();
  const skippedNoCity = [];
  const toUpdate = [];

  for (const r of rows) {
    if (!r.city || !String(r.city).trim()) {
      skippedNoCity.push(r.id);
      continue;
    }
    const { key, coords } = centroidFor(r.city);
    if (!coords) {
      const k = key || `<empty:${r.city}>`;
      unknown.set(k, (unknown.get(k) || 0) + 1);
      continue;
    }
    toUpdate.push({ id: r.id, lat: coords[0], lng: coords[1], key });
  }

  let updated = 0;
  if (APPLY && toUpdate.length) {
    const extra = extraSet ? `, ${extraSet}` : '';
    const sql =
      `UPDATE ${table} SET latitude=?, longitude=?, location_approx=1, location_source=?${extra} WHERE id=?`;
    for (const u of toUpdate) {
      await run(db, sql, [u.lat, u.lng, `city_centroid:${u.key}`, u.id]);
      updated++;
    }
  }

  return {
    candidates: rows.length,
    matched: toUpdate.length,
    skippedNoCity: skippedNoCity.length,
    unknown: Object.fromEntries(unknown),
    updated,
  };
}

(async () => {
  const db = new sqlite3.Database(dbPath);

  const schemaChanges = await ensureSchema(db);
  console.log(`[backfill-coords] SCHEMA: ${schemaChanges.join(' | ')}`);

  if (APPLY) await run(db, 'BEGIN');
  try {
    const jobs = await processTable(db, {
      table: 'jobs',
      cityCol: 'location',
    });
    const users = await processTable(db, {
      table: 'users',
      cityCol: 'city',
      extraSet: `lastLocationAt = COALESCE(lastLocationAt, datetime('now'))`,
    });
    if (APPLY) await run(db, 'COMMIT');

    console.log('[backfill-coords] JOBS  :', JSON.stringify(jobs));
    console.log('[backfill-coords] USERS :', JSON.stringify(users));

    const jOk = await get(db, `SELECT COUNT(*) c FROM jobs WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND NOT (latitude=0 AND longitude=0)`);
    const uOk = await get(db, `SELECT COUNT(*) c FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND NOT (latitude=0 AND longitude=0)`);
    console.log(`[backfill-coords] VERIFY: jobs_with_coords=${jOk.c}, users_with_coords=${uOk.c}`);

    if (DRY) console.log('[backfill-coords] (dry-run — no rows written; pass --apply to commit)');
  } catch (e) {
    if (APPLY) { try { await run(db, 'ROLLBACK'); } catch (_) {} }
    throw e;
  } finally {
    db.close();
  }
})().catch(e => { console.error('[backfill-coords] FAILED:', e); process.exit(1); });
