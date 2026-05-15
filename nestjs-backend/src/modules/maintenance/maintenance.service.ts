import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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
      const coords = key ? CITY_CENTROIDS[key] : null;
      if (!coords || !key) {
        const k = key || `<empty:${r.city}>`;
        unknown.set(k, (unknown.get(k) || 0) + 1);
        continue;
      }
      toUpdate.push({ id: r.id, lat: coords[0], lng: coords[1], key });
    }

    let updated = 0;
    if (apply && toUpdate.length) {
      const extra = extraSet ? `, ${extraSet}` : '';
      const sql = `UPDATE ${table} SET latitude=?, longitude=?, location_approx=1, location_source=?${extra} WHERE id=?`;
      for (const u of toUpdate) {
        await this.ds.query(sql, [
          u.lat,
          u.lng,
          `city_centroid:${u.key}`,
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
}
