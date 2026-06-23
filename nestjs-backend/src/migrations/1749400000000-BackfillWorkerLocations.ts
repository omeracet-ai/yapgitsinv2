import { MigrationInterface, QueryRunner } from 'typeorm';
import { encodeGeohash } from '../common/geohash.util';

/**
 * Phase 509 — Worker konum backfill + bozuk koordinat temizliği.
 *
 * Tanı (hatalar.txt M8): "Harita sekmesinde Haritalara veriler gelmiyor" +
 * "Hızlı hizmet verenlere ulaş" boş listeleniyor. Curl ile prod'da test:
 *   - GET /jobs/nearby?lat=41.0082&lng=28.9784&radius=50 → 200 OK, 10+ ilan ✅
 *   - GET /users/workers/nearby?lat=41.0082&lon=28.9784&radius=50 → 200 OK,
 *     data:[] ❌
 *
 * Root cause (3 ayrı sorun, hepsi aynı tabloda):
 *   1) Seed worker'larda (Mehmet Demir, Ayşe Yılmaz, Kemal Şahin) `latitude`,
 *      `longitude`, `homeGeohash` hepsi NULL. `findNearbyWorkers` ön filtresi
 *      `homeGeohash IS NOT NULL` bu satırları doğrudan eliyor.
 *   2) Bir worker (Ömer Faruk Acet) lat=37.42, lon=-122.08 (Google HQ /
 *      Mountain View) ile dolmuş — büyük olasılıkla emulator default fake
 *      konumu. Türkiye dışı, herhangi bir TR sorgusu için anlamsız.
 *   3) Demo Adas için lat/lon dolu, geohash de var ama olası başka kayıtlarda
 *      lat/lon set edilmiş olabilir ve `homeGeohash` boş kalmış olabilir
 *      (eski location update kodu geohash güncellemiyordu).
 *
 * Bu migration:
 *   A) Türkiye bbox dışındaki worker koordinatlarını (lat<35 || lat>43 ||
 *      lon<25 || lon>46) sıfırlar. Kullanıcı sonradan kendi gerçek konumu ile
 *      günceller. Veri kaybı yok — zaten bozuk.
 *   B) workerCategories dolu + lat/lon dolu + homeGeohash boş kayıtlara
 *      geohash6 hesaplar (defansif).
 *   C) workerCategories dolu + lat/lon NULL kayıtlara seed-tarzı şehir bazlı
 *      varsayılan koordinat verir — `city` alanına bakarak. Bilinmeyen şehir
 *      → İstanbul merkezi. Böylece 3 seed worker (Mehmet/Ayşe/Kemal) ve
 *      konumunu hiç paylaşmamış gerçek worker'lar haritada görünür hâle gelir.
 *
 * Idempotent: tekrar çalıştırılırsa NOOP (zaten dolu olanlara dokunmaz).
 */

// Türkiye bbox — kabaca. Karadeniz/Ege/Akdeniz dahil.
const TR_LAT_MIN = 35.0;
const TR_LAT_MAX = 43.0;
const TR_LON_MIN = 25.0;
const TR_LON_MAX = 46.0;

// Şehir → (lat, lon) merkez koordinatı. Seed worker'ların `city` alanı bunlardan
// biri olduğunda anlamlı; aksi halde İstanbul fallback.
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

// Aynı seed worker iki kez çalıştırıldığında üst üste binmesin diye küçük
// deterministik offset (id hash'ten). +/- ~0.02° ≈ 2 km.
function jitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const lat = ((h % 200) - 100) / 5000; // ~±0.02
  const lon = (((h >> 8) % 200) - 100) / 5000;
  return [lat, lon];
}

export class BackfillWorkerLocations1749400000000
  implements MigrationInterface
{
  name = 'BackfillWorkerLocations1749400000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ── A) Türkiye dışı koordinatları temizle ──────────────────────────────
    // workerCategories dolu (gerçek usta hesabı) + Türkiye dışı koordinat.
    const outOfBounds = (await qr.query(
      `SELECT id, latitude, longitude FROM "users"
       WHERE "workerCategories" IS NOT NULL
         AND "workerCategories" != '[]'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND (latitude < ? OR latitude > ? OR longitude < ? OR longitude > ?)`,
      [TR_LAT_MIN, TR_LAT_MAX, TR_LON_MIN, TR_LON_MAX],
    )) as Array<{ id: string; latitude: number; longitude: number }>;

    for (const u of outOfBounds) {
      await qr.query(
        `UPDATE "users"
         SET latitude = NULL,
             longitude = NULL,
             "homeGeohash" = NULL,
             "lastLocationAt" = NULL
         WHERE id = ?`,
        [u.id],
      );
    }

    // ── B) homeGeohash backfill: lat/lon dolu ama geohash boş ──────────────
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

    // ── C) lat/lon NULL olan worker'lara şehir merkezi ata ────────────────
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
    // No-op — backfill geri alınmıyor.
    void _qr;
  }
}
