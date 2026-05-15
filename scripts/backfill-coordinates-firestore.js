#!/usr/bin/env node
/**
 * Voldi-db #2 — Firestore city → centroid geocode backfill.
 *
 * Reads `jobs` and `users` documents from Firestore (project: yapgitsinv2),
 * finds docs where lat/lng are missing but `city` is set, and writes the
 * honest TR city centroid (no jitter, no fabrication). Unknown cities are
 * skipped and logged.
 *
 * Auth: firebase-admin Application Default Credentials.
 *   - Either `firebase login` + `gcloud auth application-default login`
 *   - Or GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
 *
 * Usage:
 *   node scripts/backfill-coordinates-firestore.js              # dry-run (default)
 *   node scripts/backfill-coordinates-firestore.js --dry-run    # explicit
 *   node scripts/backfill-coordinates-firestore.js --apply      # WRITE to prod
 *
 * Optional flags:
 *   --project=<id>           override project id (default: yapgitsinv2)
 *   --collections=jobs,users only backfill listed collections
 *   --limit=N                cap docs per collection (test mode)
 */

const path = require('path');
const Module = require('module');

// Reuse firebase-admin installed in firebase/functions
const adminPath = path.resolve(__dirname, '../firebase/functions/node_modules');
if (!Module.globalPaths.includes(adminPath)) Module.globalPaths.push(adminPath);

let admin;
try {
  admin = require(path.join(adminPath, 'firebase-admin'));
} catch (e) {
  console.error('[backfill-geo] firebase-admin not found at', adminPath);
  console.error('  Run: cd firebase/functions && npm install');
  process.exit(2);
}

// ---- Args ---------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY = !APPLY; // dry by default
const PROJECT_ID =
  (args.find(a => a.startsWith('--project=')) || '').split('=')[1] || 'yapgitsinv2';
const COLLECTIONS =
  ((args.find(a => a.startsWith('--collections=')) || '').split('=')[1] || 'jobs,users')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const LIMIT_ARG = (args.find(a => a.startsWith('--limit=')) || '').split('=')[1];
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG, 10) : null;

// ---- TR city centroid table (honest, no jitter) ------------------------
const CENTROIDS = {
  istanbul:        [41.0082, 28.9784],
  ankara:          [39.9334, 32.8597],
  izmir:           [38.4192, 27.1287],
  bursa:           [40.1828, 29.0665],
  antalya:         [36.8969, 30.7133],
  adana:           [37.0000, 35.3213],
  konya:           [37.8746, 32.4932],
  gaziantep:       [37.0662, 37.3833],
  sanliurfa:       [37.1591, 38.7969],
  kocaeli:         [40.8533, 29.8815],
  mersin:          [36.8121, 34.6415],
  diyarbakir:      [37.9144, 40.2306],
  hatay:           [36.4018, 36.3498],
  manisa:          [38.6191, 27.4289],
  kayseri:         [38.7312, 35.4787],
  samsun:          [41.2867, 36.3300],
  balikesir:       [39.6484, 27.8826],
  kahramanmaras:   [37.5858, 36.9371],
  van:             [38.4942, 43.3800],
  aydin:           [37.8560, 27.8416],
  tekirdag:        [40.9833, 27.5167],
  sakarya:         [40.7569, 30.3781],
  denizli:         [37.7765, 29.0864],
  mugla:           [37.2153, 28.3636],
  eskisehir:       [39.7767, 30.5206],
  trabzon:         [41.0027, 39.7168],
  ordu:            [40.9839, 37.8764],
  afyonkarahisar:  [38.7507, 30.5567],
  malatya:         [38.3552, 38.3095],
  erzurum:         [39.9043, 41.2679],
};

// Common aliases / Antep/Maraş/Urfa/Afyon shorthand → official slug
const ALIASES = {
  'antep': 'gaziantep',
  'maras': 'kahramanmaras',
  'urfa': 'sanliurfa',
  'afyon': 'afyonkarahisar',
  'istambul': 'istanbul',
  'kocaali': 'kocaeli',
  'izmit': 'kocaeli',
  'adapazari': 'sakarya',
};

function normalizeCity(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const lower = raw
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, '');
  if (!lower) return null;
  return ALIASES[lower] || lower;
}

function hasCoords(d) {
  // accept either {lat,lng} or {latitude,longitude}
  const lat = d.lat ?? d.latitude;
  const lng = d.lng ?? d.longitude;
  return typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
}

// ---- Init ---------------------------------------------------------------
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
} catch (e) {
  console.error('[backfill-geo] initializeApp failed:', e.message);
  process.exit(3);
}
const db = admin.firestore();

// ---- Core ---------------------------------------------------------------
async function processCollection(name) {
  console.log(`\n[backfill-geo] --- ${name} ---`);
  let query = db.collection(name);
  if (LIMIT) query = query.limit(LIMIT);

  let snap;
  try {
    snap = await query.get();
  } catch (e) {
    console.error(`[backfill-geo] read failed for ${name}:`, e.message);
    return { matched: 0, skippedNoCity: 0, alreadyCoords: 0, unknown: {}, total: 0 };
  }

  const stats = { matched: 0, skippedNoCity: 0, alreadyCoords: 0, unknown: {}, byCity: {}, total: snap.size };
  const updates = []; // {ref, payload}

  snap.forEach(doc => {
    const data = doc.data() || {};
    if (hasCoords(data)) { stats.alreadyCoords++; return; }
    const rawCity = data.city || data.cityName || data.il || null;
    if (!rawCity) { stats.skippedNoCity++; return; }
    const slug = normalizeCity(rawCity);
    const hit = slug ? CENTROIDS[slug] : null;
    if (!hit) {
      const key = String(rawCity).trim();
      stats.unknown[key] = (stats.unknown[key] || 0) + 1;
      return;
    }
    const [lat, lng] = hit;
    stats.matched++;
    stats.byCity[slug] = (stats.byCity[slug] || 0) + 1;
    updates.push({
      ref: doc.ref,
      payload: {
        lat,
        lng,
        locationApprox: true,
        locationSource: 'city-centroid',
        locationBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  });

  console.log(
    `[backfill-geo] ${name}: total=${stats.total} alreadyCoords=${stats.alreadyCoords} ` +
    `matched=${stats.matched} skippedNoCity=${stats.skippedNoCity} unknown=${Object.keys(stats.unknown).length}`
  );
  if (Object.keys(stats.unknown).length) {
    const sorted = Object.entries(stats.unknown).sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log('[backfill-geo] unknown cities (top 20):', sorted);
  }
  if (Object.keys(stats.byCity).length) {
    console.log('[backfill-geo] matched by city:', stats.byCity);
  }

  if (APPLY && updates.length) {
    let written = 0;
    for (let i = 0; i < updates.length; i += 400) {
      const batch = db.batch();
      const slice = updates.slice(i, i + 400);
      slice.forEach(u => batch.update(u.ref, u.payload));
      await batch.commit();
      written += slice.length;
      console.log(`[backfill-geo] ${name}: committed ${written}/${updates.length}`);
    }
  } else if (DRY) {
    console.log(`[backfill-geo] ${name}: DRY-RUN — no writes. (would write ${updates.length})`);
  }

  return stats;
}

(async () => {
  console.log(`[backfill-geo] project=${PROJECT_ID} mode=${APPLY ? 'APPLY' : 'DRY-RUN'} collections=${COLLECTIONS.join(',')}${LIMIT ? ' limit=' + LIMIT : ''}`);
  const summary = {};
  for (const c of COLLECTIONS) {
    summary[c] = await processCollection(c);
  }
  console.log('\n[backfill-geo] === SUMMARY ===');
  for (const [c, s] of Object.entries(summary)) {
    console.log(
      `  ${c}: total=${s.total} alreadyCoords=${s.alreadyCoords} matched=${s.matched} ` +
      `skippedNoCity=${s.skippedNoCity} unknownCities=${Object.keys(s.unknown).length}`
    );
  }
  if (!APPLY) {
    console.log('\n[backfill-geo] Re-run with --apply to write. Chunks of 400.');
  }
  process.exit(0);
})().catch(e => {
  console.error('[backfill-geo] FATAL:', e);
  process.exit(1);
});
