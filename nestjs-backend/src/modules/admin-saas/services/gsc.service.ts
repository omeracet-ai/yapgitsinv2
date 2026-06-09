import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GscCache } from '../entities/gsc-cache.entity';

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

@Injectable()
export class GscService {
  private readonly logger = new Logger(GscService.name);
  private readonly TTL_MS = 60 * 60 * 1000;

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
      // Live GSC fetch not yet implemented — fall back to mock with warning.
      this.logger.warn('GSC_OAUTH_ENABLED=true but live fetch not implemented yet — returning mock');
      payload = this.mockReport(days);
    } else {
      payload = this.mockReport(days);
    }

    // Upsert cache
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
