import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { encodeGeohash } from '../../common/geohash.util';

const DEMO_WORKER_CATEGORIES = [
  'Tesisat',
  'Elektrik',
  'Temizlik',
  'Nakliyat',
  'Tadilat',
  'Boyacı',
  'Marangoz',
  'Bahçıvan',
  'Klima',
  'Beyaz Eşya',
  'Çatı',
  'Cam Balkon',
  'Mobilya Montaj',
  'Halı Yıkama',
  'İlaçlama',
];

/**
 * Voldi-fs / Phase 218 — Admin maintenance: city-centroid coordinate backfill.
 *
 * Mirrors scripts/backfill-coords.js as an HTTP-callable service so Plesk
 * (no Scheduled Tasks license) can trigger it via curl with admin JWT.
 *
 * Uses raw SQL through DataSource because `location_approx` / `location_source`
 * columns are NOT in the TypeORM entities (added via ALTER TABLE on first run).
 */

const CITY_CENTROIDS: Record<string, [number, number]> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4192, 27.1287],
  bursa: [40.1828, 29.0665],
  antalya: [36.8969, 30.7133],
  adana: [37.0, 35.3213],
  konya: [37.8746, 32.4932],
  gaziantep: [37.0662, 37.3833],
  sanliurfa: [37.1591, 38.7969],
  kocaeli: [40.8533, 29.8815],
  mersin: [36.8121, 34.6415],
  diyarbakir: [37.9144, 40.2306],
  hatay: [36.4018, 36.3498],
  manisa: [38.6191, 27.4289],
  kayseri: [38.7312, 35.4787],
  samsun: [41.2867, 36.33],
  balikesir: [39.6484, 27.8826],
  kahramanmaras: [37.5858, 36.9371],
  van: [38.4942, 43.38],
  aydin: [37.856, 27.8416],
  tekirdag: [40.9833, 27.5167],
  sakarya: [40.7569, 30.3781],
  denizli: [37.7765, 29.0864],
  mugla: [37.2153, 28.3636],
  eskisehir: [39.7767, 30.5206],
  trabzon: [41.0027, 39.7168],
  ordu: [40.9839, 37.8764],
  afyonkarahisar: [38.7507, 30.5567],
  malatya: [38.3552, 38.3095],
  erzurum: [39.9043, 41.2679],
};

const ALIASES: Record<string, string> = {
  afyon: 'afyonkarahisar',
  maras: 'kahramanmaras',
  kmaras: 'kahramanmaras',
  urfa: 'sanliurfa',
  'k.maras': 'kahramanmaras',
  'istanbul-avrupa': 'istanbul',
  'istanbul-anadolu': 'istanbul',
};

/**
 * District (ilçe) → City (şehir) mapping for fallback lookup when user/job
 * "city" field actually contains a district name (kadikoy, cankaya, bornova...).
 * Keys must be in normalizeCity() output form (lowercase, ASCII, no diacritics).
 */
const DISTRICT_TO_CITY: Record<string, string> = {
  // İstanbul (39 ilçe)
  adalar: 'istanbul', arnavutkoy: 'istanbul', atasehir: 'istanbul',
  avcilar: 'istanbul', bagcilar: 'istanbul', bahcelievler: 'istanbul',
  bakirkoy: 'istanbul', basaksehir: 'istanbul', bayrampasa: 'istanbul',
  besiktas: 'istanbul', beykoz: 'istanbul', beylikduzu: 'istanbul',
  beyoglu: 'istanbul', buyukcekmece: 'istanbul', catalca: 'istanbul',
  cekmekoy: 'istanbul', esenler: 'istanbul', esenyurt: 'istanbul',
  eyupsultan: 'istanbul', fatih: 'istanbul', gaziosmanpasa: 'istanbul',
  gungoren: 'istanbul', kadikoy: 'istanbul', kagithane: 'istanbul',
  kartal: 'istanbul', kucukcekmece: 'istanbul', maltepe: 'istanbul',
  pendik: 'istanbul', sancaktepe: 'istanbul', sariyer: 'istanbul',
  sile: 'istanbul', silivri: 'istanbul', sisli: 'istanbul',
  sultanbeyli: 'istanbul', sultangazi: 'istanbul', tuzla: 'istanbul',
  umraniye: 'istanbul', uskudar: 'istanbul', zeytinburnu: 'istanbul',

  // Ankara
  cankaya: 'ankara', kecioren: 'ankara', mamak: 'ankara',
  yenimahalle: 'ankara', sincan: 'ankara', etimesgut: 'ankara',
  altindag: 'ankara', pursaklar: 'ankara', golbasi: 'ankara',
  polatli: 'ankara', kazan: 'ankara', beypazari: 'ankara',

  // İzmir
  bornova: 'izmir', karsiyaka: 'izmir', konak: 'izmir',
  buca: 'izmir', cigli: 'izmir', gaziemir: 'izmir',
  karabaglar: 'izmir', narlidere: 'izmir', balcova: 'izmir',
  guzelbahce: 'izmir', urla: 'izmir', cesme: 'izmir',
  aliaga: 'izmir', menemen: 'izmir', foca: 'izmir',
  menderes: 'izmir', odemis: 'izmir', tire: 'izmir',
  torbali: 'izmir', bergama: 'izmir', dikili: 'izmir',

  // Bursa
  nilufer: 'bursa', osmangazi: 'bursa', yildirim: 'bursa',
  gemlik: 'bursa', mudanya: 'bursa', inegol: 'bursa',
  iznik: 'bursa', orhangazi: 'bursa', kestel: 'bursa',

  // Antalya
  muratpasa: 'antalya', konyaalti: 'antalya', kepez: 'antalya',
  aksu: 'antalya', 'doseme-alti': 'antalya', dosemealti: 'antalya',
  serik: 'antalya', manavgat: 'antalya', alanya: 'antalya',
  kemer: 'antalya', kas: 'antalya', kumluca: 'antalya',
  finike: 'antalya', gazipasa: 'antalya', demre: 'antalya',

  // Adana
  seyhan: 'adana', yuregir: 'adana', cukurova: 'adana',
  saricam: 'adana', karatas: 'adana', ceyhan: 'adana',

  // Konya
  selcuklu: 'konya', meram: 'konya', karatay: 'konya',
  beysehir: 'konya', eregli: 'konya', aksehir: 'konya',

  // Gaziantep
  sahinbey: 'gaziantep', sehitkamil: 'gaziantep', nizip: 'gaziantep',

  // Kocaeli
  izmit: 'kocaeli', gebze: 'kocaeli', darica: 'kocaeli',

  // Mersin
  tarsus: 'mersin', erdemli: 'mersin',

  // Diyarbakır
  baglar: 'diyarbakir',

  // Hatay
  antakya: 'hatay', iskenderun: 'hatay',

  // Manisa
  turgutlu: 'manisa', akhisar: 'manisa', salihli: 'manisa',

  // Kayseri
  kocasinan: 'kayseri', melikgazi: 'kayseri',

  // Samsun
  ilkadim: 'samsun', atakum: 'samsun', canik: 'samsun',

  // Balıkesir
  altieylul: 'balikesir', karesi: 'balikesir', edremit: 'balikesir',

  // Kahramanmaraş
  onikisubat: 'kahramanmaras', dulkadiroglu: 'kahramanmaras',

  // Aydın
  efeler: 'aydin', kusadasi: 'aydin', nazilli: 'aydin', didim: 'aydin',

  // Tekirdağ
  corlu: 'tekirdag', cerkezkoy: 'tekirdag', suleymanpasa: 'tekirdag',

  // Sakarya
  adapazari: 'sakarya', serdivan: 'sakarya',

  // Denizli
  pamukkale: 'denizli', merkezefendi: 'denizli',

  // Muğla
  bodrum: 'mugla', marmaris: 'mugla', fethiye: 'mugla', datca: 'mugla',

  // Eskişehir
  tepebasi: 'eskisehir', odunpazari: 'eskisehir',

  // Trabzon
  ortahisar: 'trabzon', akcaabat: 'trabzon',

  // Erzurum
  palandoken: 'erzurum', yakutiye: 'erzurum',

  // Malatya
  battalgazi: 'malatya', yesilyurt: 'malatya',
};

/**
 * Placeholder values that should be skipped (counted as no-city) instead of
 * landing in the unknown bucket.
 */
const PLACEHOLDER_CITY_KEYS = new Set<string>([
  'belirtilmedi',
  'bilinmiyor',
  'bos',
  'yok',
  'na',
  'null',
  'undefined',
  '-',
]);

function normalizeCity(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const first = raw.split(/[,/|]/)[0].trim();
  if (!first) return null;
  const map: Record<string, string> = {
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

export interface TableResult {
  candidates: number;
  matched: number;
  skipped_no_city: number;
  unknown: Record<string, number>;
  updated: number;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async columnExists(table: string, col: string): Promise<boolean> {
    const rows: Array<{ name: string }> = await this.ds.query(
      `PRAGMA table_info(${table})`,
    );
    return rows.some((r) => r.name === col);
  }

  private async ensureSchema(): Promise<string[]> {
    const changes: string[] = [];
    for (const table of ['jobs', 'users']) {
      if (!(await this.columnExists(table, 'location_approx'))) {
        await this.ds.query(
          `ALTER TABLE ${table} ADD COLUMN location_approx INTEGER DEFAULT 0`,
        );
        changes.push(`${table}.location_approx ADDED`);
      } else {
        changes.push(`${table}.location_approx exists`);
      }
      if (!(await this.columnExists(table, 'location_source'))) {
        await this.ds.query(
          `ALTER TABLE ${table} ADD COLUMN location_source TEXT`,
        );
        changes.push(`${table}.location_source ADDED`);
      } else {
        changes.push(`${table}.location_source exists`);
      }
    }
    return changes;
  }

  private async processTable(
    table: string,
    cityCol: string,
    apply: boolean,
    extraSet?: string,
  ): Promise<TableResult> {
    const missingCoordSql =
      '(latitude IS NULL OR longitude IS NULL OR (latitude = 0 AND longitude = 0))';
    const rows: Array<{ id: string | number; city: string | null }> =
      await this.ds.query(
        `SELECT id, ${cityCol} AS city FROM ${table} WHERE ${missingCoordSql}`,
      );

    const unknown = new Map<string, number>();
    const toUpdate: Array<{
      id: string | number;
      lat: number;
      lng: number;
      key: string;
    }> = [];
    let skippedNoCity = 0;

    for (const r of rows) {
      if (!r.city || !String(r.city).trim()) {
        skippedNoCity++;
        continue;
      }
      const key = normalizeCity(r.city);
      if (!key) {
        unknown.set(`<empty:${r.city}>`, (unknown.get(`<empty:${r.city}>`) || 0) + 1);
        continue;
      }
      if (PLACEHOLDER_CITY_KEYS.has(key)) {
        skippedNoCity++;
        continue;
      }
      // 2-pass lookup: city first, then ilçe→şehir fallback.
      const cityKey = CITY_CENTROIDS[key]
        ? key
        : DISTRICT_TO_CITY[key];
      const coords = cityKey ? CITY_CENTROIDS[cityKey] : null;
      if (!coords || !cityKey) {
        unknown.set(key, (unknown.get(key) || 0) + 1);
        continue;
      }
      const sourceKey =
        cityKey === key
          ? `city_centroid:${cityKey}`
          : `district_to_city:${key}->${cityKey}`;
      toUpdate.push({ id: r.id, lat: coords[0], lng: coords[1], key: sourceKey });
    }

    let updated = 0;
    if (apply && toUpdate.length) {
      const extra = extraSet ? `, ${extraSet}` : '';
      const sql = `UPDATE ${table} SET latitude=?, longitude=?, location_approx=1, location_source=?${extra} WHERE id=?`;
      for (const u of toUpdate) {
        await this.ds.query(sql, [
          u.lat,
          u.lng,
          u.key,
          u.id,
        ]);
        updated++;
      }
    }

    return {
      candidates: rows.length,
      matched: toUpdate.length,
      skipped_no_city: skippedNoCity,
      unknown: Object.fromEntries(unknown),
      updated,
    };
  }

  async backfillCoordinates(apply: boolean) {
    const start = Date.now();
    const driver = this.ds.options.type;
    if (driver !== 'sqlite' && driver !== 'better-sqlite3') {
      // Defensive: city-centroid script uses PRAGMA + ALTER COLUMN syntax tuned for SQLite.
      // For mysql/postgres a separate implementation would be required.
      throw new Error(
        `backfill-coords currently supports SQLite only; active driver=${driver}`,
      );
    }

    this.logger.log(
      `backfill-coords start mode=${apply ? 'apply' : 'dry-run'}`,
    );

    const schemaChanges = await this.ensureSchema();

    let jobsResult: TableResult;
    let usersResult: TableResult;

    const runner = this.ds.createQueryRunner();
    await runner.connect();
    try {
      if (apply) await runner.startTransaction();
      jobsResult = await this.processTable('jobs', 'location', apply);
      usersResult = await this.processTable(
        'users',
        'city',
        apply,
        `lastLocationAt = COALESCE(lastLocationAt, datetime('now'))`,
      );
      if (apply) await runner.commitTransaction();
    } catch (e) {
      if (apply && runner.isTransactionActive) {
        try {
          await runner.rollbackTransaction();
        } catch {
          /* swallow */
        }
      }
      throw e;
    } finally {
      await runner.release();
    }

    const jOk: Array<{ c: number }> = await this.ds.query(
      `SELECT COUNT(*) c FROM jobs WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND NOT (latitude=0 AND longitude=0)`,
    );
    const uOk: Array<{ c: number }> = await this.ds.query(
      `SELECT COUNT(*) c FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND NOT (latitude=0 AND longitude=0)`,
    );

    const result = {
      mode: apply ? 'apply' : 'dry-run',
      schema: { changes: schemaChanges },
      jobs: jobsResult,
      users: usersResult,
      verify: {
        jobs_with_coords: Number(jOk[0]?.c ?? 0),
        users_with_coords: Number(uOk[0]?.c ?? 0),
      },
      durationMs: Date.now() - start,
    };

    this.logger.log(
      `backfill-coords done jobs.matched=${jobsResult.matched} users.matched=${usersResult.matched} apply=${apply} ms=${result.durationMs}`,
    );
    return result;
  }

  /**
   * Phase — Demo worker seed.
   * Promotes existing customer rows (with coordinates already) to worker so the
   * /users/workers/nearby map endpoint returns pins. Picks coord-backed users
   * whose workerCategories is empty/null and role='user', assigns 1-3 random
   * categories + homeGeohash@6 + serviceRadiusKm=30 + isAvailable=true.
   */
  /**
   * P222 — Ensure performance-critical indexes exist on hot tables.
   * Idempotent via IF NOT EXISTS — safe to call repeatedly. Run after deploy
   * or whenever a missing-index regression is suspected. SQLite-only paths.
   */
  async ensureIndexes() {
    const start = Date.now();
    const driver = this.ds.options.type;
    if (driver !== 'sqlite' && driver !== 'better-sqlite3') {
      throw new Error(
        `ensure-indexes currently supports SQLite only; active driver=${driver}`,
      );
    }
    const queries = [
      "CREATE INDEX IF NOT EXISTS idx_jobs_status_createdAt ON jobs(status, createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_jobs_customerId_status ON jobs(customerId, status)",
      "CREATE INDEX IF NOT EXISTS idx_jobs_categoryId_status_createdAt ON jobs(categoryId, status, createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_jobs_featuredUntil ON jobs(featuredUntil)",
      "CREATE INDEX IF NOT EXISTS idx_jobs_geohash ON jobs(geohash)",
      "CREATE INDEX IF NOT EXISTS idx_users_homeGeohash ON users(homeGeohash)",
      "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
      "CREATE INDEX IF NOT EXISTS idx_users_isAvailable ON users(isAvailable)",
    ];
    const results: Array<{ query: string; status?: string; error?: string }> = [];
    for (const q of queries) {
      try {
        await this.ds.query(q);
        results.push({ query: q.substring(0, 80), status: 'ok' });
      } catch (e) {
        results.push({
          query: q.substring(0, 80),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const ok = results.filter((r) => r.status === 'ok').length;
    this.logger.log(
      `ensure-indexes done ok=${ok}/${results.length} ms=${Date.now() - start}`,
    );
    return {
      mode: 'ensure-indexes',
      count: results.length,
      ok,
      results,
      durationMs: Date.now() - start,
    };
  }

  async seedDemoWorkers(opts: { count: number; dryRun: boolean }) {
    const start = Date.now();
    const count = Math.max(1, Math.min(opts.count | 0 || 5, 50));
    const isSqlite =
      this.ds.options.type === 'sqlite' ||
      this.ds.options.type === 'better-sqlite3';

    // Pull larger candidate pool (2x) then random-pick.
    const limitParam = Math.min(count * 4, 200);
    const candidates: Array<{
      id: string | number;
      email: string | null;
      fullName: string | null;
      latitude: number;
      longitude: number;
      city: string | null;
    }> = await this.ds.query(
      `SELECT id, email, fullName, latitude, longitude, city
       FROM users
       WHERE latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND NOT (latitude = 0 AND longitude = 0)
         AND (workerCategories IS NULL OR workerCategories = '' OR workerCategories = '[]')
         AND (role = 'user' OR role IS NULL)
       LIMIT ${limitParam}`,
    );

    // Fisher-Yates shuffle, take first N.
    const pool = [...candidates];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, count);

    const promoted: Array<{
      id: string | number;
      email: string | null;
      fullName: string | null;
      city: string | null;
      coords: [number, number];
      assigned_skills: string[];
      geohash: string;
    }> = [];

    if (selected.length && !opts.dryRun) {
      const runner = this.ds.createQueryRunner();
      await runner.connect();
      try {
        await runner.startTransaction();
        for (const u of selected) {
          const skillCount = 1 + Math.floor(Math.random() * 3); // 1..3
          const skills = [...DEMO_WORKER_CATEGORIES]
            .sort(() => Math.random() - 0.5)
            .slice(0, skillCount);
          const geohash = encodeGeohash(
            Number(u.latitude),
            Number(u.longitude),
            6,
          );
          const availableSet = isSqlite
            ? `isAvailable = 1`
            : `isAvailable = TRUE`;
          await runner.query(
            `UPDATE users SET
               workerCategories = ?,
               ${availableSet},
               homeGeohash = ?,
               serviceRadiusKm = 30
             WHERE id = ?`,
            [JSON.stringify(skills), geohash, u.id],
          );
          promoted.push({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            city: u.city,
            coords: [Number(u.latitude), Number(u.longitude)],
            assigned_skills: skills,
            geohash,
          });
        }
        await runner.commitTransaction();
      } catch (e) {
        if (runner.isTransactionActive) {
          try {
            await runner.rollbackTransaction();
          } catch {
            /* swallow */
          }
        }
        throw e;
      } finally {
        await runner.release();
      }
    } else {
      // dry-run: still compute plan
      for (const u of selected) {
        const skillCount = 1 + Math.floor(Math.random() * 3);
        const skills = [...DEMO_WORKER_CATEGORIES]
          .sort(() => Math.random() - 0.5)
          .slice(0, skillCount);
        const geohash = encodeGeohash(
          Number(u.latitude),
          Number(u.longitude),
          6,
        );
        promoted.push({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          city: u.city,
          coords: [Number(u.latitude), Number(u.longitude)],
          assigned_skills: skills,
          geohash,
        });
      }
    }

    const total: Array<{ c: number }> = await this.ds.query(
      `SELECT COUNT(*) c FROM users
       WHERE workerCategories IS NOT NULL
         AND workerCategories != ''
         AND workerCategories != '[]'
         AND isAvailable = 1
         AND homeGeohash IS NOT NULL`,
    );

    const result = {
      mode: opts.dryRun ? 'dry-run' : 'apply',
      count_requested: count,
      candidates_available: candidates.length,
      promoted: promoted.length,
      total_demo_workers_after: Number(total[0]?.c ?? 0),
      workers: promoted,
      durationMs: Date.now() - start,
    };

    this.logger.log(
      `seed-demo-workers done mode=${result.mode} promoted=${promoted.length}/${count} pool=${candidates.length} ms=${result.durationMs}`,
    );
    return result;
  }
}
