import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GscCache } from '../entities/gsc-cache.entity';
import * as fs from 'fs';

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscReport {
  source: 'live' | 'mock';
  days: number;
  totals: { clicks: number; impressions: number; avgCtr: number; avgPosition: number };
  topQueries: GscRow[];
  topPages: GscRow[];
  quickWins: GscRow[];
  falling: GscRow[];
  trend: Array<{ date: string; clicks: number; impressions: number }>;
}

// Lazy import — package may be absent in dev/CI when GSC_OAUTH_ENABLED=false.
// Typed as `any` so the type-checker doesn't require @types/googleapis at compile.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GoogleApisModule = any;

interface ServiceAccountCreds {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

/**
 * Phase 489 (Faz J/3) — Google Search Console live data.
 *
 * Two paths:
 *  - GSC_OAUTH_ENABLED !== 'true'           → mock report (legacy behaviour).
 *  - GSC_OAUTH_ENABLED === 'true' + creds   → live Search Analytics API call,
 *    authenticated via service account (JSON content or file path in env).
 *
 * Required env when enabled:
 *   GSC_SERVICE_ACCOUNT_JSON   — full JSON content OR absolute path to .json
 *   GSC_SITE_URL               — exact GSC property (e.g. 'sc-domain:yapgitsin.tr'
 *                                or 'https://yapgitsin.tr/')
 *
 * If enabled but creds are missing/invalid, falls back to mock and logs a warning
 * (graceful degradation — does NOT throw at boot or per-request).
 *
 * Token caching: googleapis JWT client refreshes its own access token (~1h TTL).
 * On top of that we cache the rendered GscReport in the gsc_cache table for 1h
 * to bound quota usage even under heavy admin polling.
 */
@Injectable()
export class GscService {
  private readonly logger = new Logger(GscService.name);
  private readonly TTL_MS = 60 * 60 * 1000;
  private googleapis: GoogleApisModule | null = null;
  private googleapisLoadFailed = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GscCache) private readonly cache: Repository<GscCache>,
  ) {}

  isEnabled(): boolean {
    return this.config.get<string>('GSC_OAUTH_ENABLED') === 'true';
  }

  async report(days = 30): Promise<GscReport> {
    const key = `gsc:report:${days}`;
    const now = new Date();
    const cached = await this.cache.findOne({ where: { key } });
    if (cached && cached.expiresAt > now) {
      return cached.payload as GscReport;
    }

    let payload: GscReport;
    if (this.isEnabled()) {
      try {
        const live = await this.fetchLive(days);
        payload = live ?? this.mockReport(days);
      } catch (err) {
        this.logger.warn(
          `GSC live fetch failed, falling back to mock: ${(err as Error).message}`,
        );
        payload = this.mockReport(days);
      }
    } else {
      payload = this.mockReport(days);
    }

    if (cached) {
      cached.payload = payload as unknown as Record<string, unknown>;
      cached.expiresAt = new Date(Date.now() + this.TTL_MS);
      await this.cache.save(cached);
    } else {
      await this.cache.save(
        this.cache.create({
          key,
          payload: payload as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + this.TTL_MS),
        }),
      );
    }
    return payload;
  }

  async quickWins(): Promise<GscRow[]> {
    const r = await this.report(90);
    return r.quickWins;
  }

  /** Loads googleapis lazily so the package is only required when enabled. */
  private getGoogleApis(): GoogleApisModule | null {
    if (this.googleapis) return this.googleapis;
    if (this.googleapisLoadFailed) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.googleapis = require('googleapis') as GoogleApisModule;
      return this.googleapis;
    } catch (err) {
      this.googleapisLoadFailed = true;
      this.logger.warn(
        `googleapis package not installed — GSC live mode unavailable: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private loadServiceAccount(): ServiceAccountCreds | null {
    const raw = this.config.get<string>('GSC_SERVICE_ACCOUNT_JSON');
    if (!raw) {
      this.logger.warn('GSC_SERVICE_ACCOUNT_JSON not set');
      return null;
    }
    let jsonStr = raw.trim();
    try {
      if (jsonStr.startsWith('{')) {
        // inline JSON
      } else if (fs.existsSync(jsonStr)) {
        // file path
        jsonStr = fs.readFileSync(jsonStr, 'utf8');
      } else {
        // try base64
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(jsonStr) as ServiceAccountCreds;
      if (!parsed.client_email || !parsed.private_key) {
        this.logger.warn(
          'GSC_SERVICE_ACCOUNT_JSON missing client_email or private_key',
        );
        return null;
      }
      return parsed;
    } catch (err) {
      this.logger.warn(
        `Failed to parse GSC_SERVICE_ACCOUNT_JSON: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /** Returns null on any failure → caller falls back to mock. */
  private async fetchLive(days: number): Promise<GscReport | null> {
    const googleapis = this.getGoogleApis();
    if (!googleapis) return null;
    const creds = this.loadServiceAccount();
    if (!creds) return null;
    const siteUrl = this.config.get<string>('GSC_SITE_URL');
    if (!siteUrl) {
      this.logger.warn('GSC_SITE_URL not set');
      return null;
    }

    const { google } = googleapis;
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    type ApiRow = {
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    };
    const normalize = (rows: ApiRow[] | undefined): GscRow[] =>
      (rows ?? []).map((r) => ({
        keys: r.keys ?? [],
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }));

    const queryReq = async (dimensions: string[], rowLimit = 20) => {
      const res = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions,
          rowLimit,
        },
      });
      return normalize(res.data.rows as ApiRow[] | undefined);
    };

    const [topQueries, topPages, trendRows] = await Promise.all([
      queryReq(['query'], 20),
      queryReq(['page'], 20),
      queryReq(['date'], 365),
    ]);

    // Quick wins: positions 11-20, decent impressions, low clicks.
    const quickWins = topQueries
      .filter((r) => r.position >= 11 && r.position <= 20 && r.impressions >= 100)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
    const falling = topQueries
      .filter((r) => r.position > 15 && r.clicks < 10)
      .slice(0, 5);

    const trend = trendRows
      .map((r) => ({
        date: r.keys[0] ?? '',
        clicks: r.clicks,
        impressions: r.impressions,
      }))
      .filter((t) => t.date);

    const totals = {
      clicks: trend.reduce((a, b) => a + b.clicks, 0),
      impressions: trend.reduce((a, b) => a + b.impressions, 0),
      avgCtr:
        topQueries.length > 0
          ? topQueries.reduce((a, b) => a + b.ctr, 0) / topQueries.length
          : 0,
      avgPosition:
        topQueries.length > 0
          ? topQueries.reduce((a, b) => a + b.position, 0) / topQueries.length
          : 0,
    };

    return {
      source: 'live',
      days,
      totals,
      topQueries,
      topPages,
      quickWins,
      falling,
      trend,
    };
  }

  private mockReport(days: number): GscReport {
    const topQueries: GscRow[] = [
      { keys: ['boya badana fiyatları'], clicks: 120, impressions: 4800, ctr: 0.025, position: 6.2 },
      { keys: ['ev temizlik fiyatları'], clicks: 85, impressions: 3200, ctr: 0.0266, position: 7.1 },
      { keys: ['elektrikçi istanbul'], clicks: 60, impressions: 2900, ctr: 0.0207, position: 9.4 },
      { keys: ['tesisatçı acil'], clicks: 40, impressions: 1800, ctr: 0.0222, position: 11.8 },
      { keys: ['nakliyat fiyatları'], clicks: 25, impressions: 1400, ctr: 0.0179, position: 14.3 },
    ];
    const topPages: GscRow[] = [
      { keys: ['/'], clicks: 250, impressions: 9000, ctr: 0.0278, position: 5.4 },
      { keys: ['/hizmet/boya-badana'], clicks: 70, impressions: 2800, ctr: 0.025, position: 7.2 },
      { keys: ['/hizmet/temizlik'], clicks: 45, impressions: 2100, ctr: 0.0214, position: 8.9 },
    ];
    const quickWins: GscRow[] = [
      { keys: ['mobilya montaj fiyatları'], clicks: 8, impressions: 320, ctr: 0.025, position: 12.4 },
      { keys: ['klima bakım fiyat'], clicks: 5, impressions: 240, ctr: 0.0208, position: 13.8 },
      { keys: ['parke ustası'], clicks: 4, impressions: 210, ctr: 0.019, position: 14.2 },
    ];
    const falling: GscRow[] = [
      { keys: ['özel ders fiyatları'], clicks: 6, impressions: 380, ctr: 0.0158, position: 18.2 },
    ];
    const trend: Array<{ date: string; clicks: number; impressions: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      trend.push({
        date: d.toISOString().slice(0, 10),
        clicks: 5 + Math.floor(Math.random() * 25),
        impressions: 200 + Math.floor(Math.random() * 600),
      });
    }
    const totals = {
      clicks: trend.reduce((a, b) => a + b.clicks, 0),
      impressions: trend.reduce((a, b) => a + b.impressions, 0),
      avgCtr: 0.024,
      avgPosition: 8.7,
    };
    return {
      source: 'mock',
      days,
      totals,
      topQueries,
      topPages,
      quickWins,
      falling,
      trend,
    };
  }
}
