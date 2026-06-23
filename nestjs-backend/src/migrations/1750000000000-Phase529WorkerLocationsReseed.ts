import { MigrationInterface, QueryRunner } from 'typeorm';
import { encodeGeohash } from '../common/geohash.util';

/**
 * Phase 529 — Worker location reseed (defansif tekrar).
 *
 * Tanı (E2E audit M3): `GET /users/workers/nearby?lat=41.0082&lon=28.9784&radius=50`
 * prod'da hâlâ empty dönüyor. Phase 509 (BackfillWorkerLocations) DB'de çalışmış
 * görünüyor (_migrations tablosunda) ama yeni eklenen worker'lar veya prod'a
 * sonradan eklenmiş seed kullanıcıları için tetiklenmemiş.
 *
 * Bu migration aynı backfill mantığını yeni bir timestamp ile tekrar çalıştırır.
 * Idempotent: zaten lat/lon dolu olan worker'lara dokunmaz.
 *
 * Strateji:
 *   1) workerCategories dolu + lat/lon NULL → city-centroid + jitter.
 *   2) workerCategories dolu + lat/lon dolu + homeGeohash NULL → encode.
 *   3) Türkiye dışı (Mountain View tarzı) koordinatlar → NULL, ardından (1).
 */

const TR_LAT_MIN = 35.0;
const TR_LAT_MAX = 43.0;
const TR_LON_MIN = 25.0;
const TR_LON_MAX = 46.0;

const CITY_CENTROIDS: Record<string, [number, number]> = {
  istanbul: [41.0082, 28.9784],
  'i̇stanbul': [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4192, 27.1287],
  bursa: [40.1885, 29.061],
  antalya: [36.8969, 30.7133],
  adana: [37.0, 35.3213],
  konya: [37.8746, 32.4932],
  gaziantep: [37.0662, 37.3833],
  kayseri: [38.7333, 35.4833],
  trabzon: [41.0027, 39.7168],
};

function centroidFor(city: string | null | undefined): [number, number] {
  if (!city) return CITY_CENTROIDS.istanbul;
  const key = city.trim().toLowerCase();
  return CITY_CENTROIDS[key] ?? CITY_CENTROIDS.istanbul;
}

function jitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const lat = ((h % 200) - 100) / 5000;
  const lon = (((h >> 8) % 200) - 100) / 5000;
  return [lat, lon];
}

export class Phase529WorkerLocationsReseed1750000000000
  implements MigrationInterface
{
  name = 'Phase529WorkerLocationsReseed1750000000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ── A) Out-of-bounds koordinatları temizle ─────────────────────────────
    const outOfBounds = (await qr.query(
      `SELECT id FROM "users"
       WHERE "workerCategories" IS NOT NULL
         AND "workerCategories" != '[]'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND (latitude < ? OR latitude > ? OR longitude < ? OR longitude > ?)`,
      [TR_LAT_MIN, TR_LAT_MAX, TR_LON_MIN, TR_LON_MAX],
    )) as Array<{ id: string }>;

    for (const u of outOfBounds) {
      await qr.query(
        `UPDATE "users"
         SET latitude = NULL, longitude = NULL,
             "homeGeohash" = NULL, "lastLocationAt" = NULL
         WHERE id = ?`,
        [u.id],
      );
    }

    // ── B) homeGeohash backfill ────────────────────────────────────────────
    const missingHash = (await qr.query(
      `SELECT id, latitude, longitude FROM "users"
       WHERE "workerCategories" IS NOT NULL
         AND "workerCategories" != '[]'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND ("homeGeohash" IS NULL OR "homeGeohash" = '')`,
    )) as Array<{ id: string; latitude: number; longitude: number }>;

    for (const u of missingHash) {
      const gh = encodeGeohash(u.latitude, u.longitude, 6);
      if (!gh) continue;
      await qr.query(`UPDATE "users" SET "homeGeohash" = ? WHERE id = ?`, [
        gh,
        u.id,
      ]);
    }

    // ── C) lat/lon NULL → city centroid + jitter ───────────────────────────
    const noLoc = (await qr.query(
      `SELECT id, city FROM "users"
       WHERE "workerCategories" IS NOT NULL
         AND "workerCategories" != '[]'
         AND (latitude IS NULL OR longitude IS NULL)`,
    )) as Array<{ id: string; city: string | null }>;

    const now = new Date().toISOString();
    for (const u of noLoc) {
      const [baseLat, baseLon] = centroidFor(u.city);
      const [jLat, jLon] = jitter(u.id);
      const lat = baseLat + jLat;
      const lon = baseLon + jLon;
      const gh = encodeGeohash(lat, lon, 6);
      await qr.query(
        `UPDATE "users"
         SET latitude = ?, longitude = ?, "homeGeohash" = ?, "lastLocationAt" = ?
         WHERE id = ?`,
        [lat, lon, gh, now, u.id],
      );
    }
  }

  public async down(_qr: QueryRunner): Promise<void> {
    void _qr;
  }
}
