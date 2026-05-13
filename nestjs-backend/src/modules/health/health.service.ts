import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

let version = '0.0.1';
try {
  const pkgPath = join(__dirname, '../..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // fallback
}

export type CheckStatus =
  | 'ok'
  | 'down'
  | 'memory-fallback'
  | 'mock'
  | 'configured'
  | 'missing'
  | 'skipped';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  version: string;
  buildSha: string;
  checks: {
    database: CheckStatus;
    cache: CheckStatus;
    iyzipay: CheckStatus;
  };
  timestamp: string;
}

export interface DeepHealthResponse extends HealthResponse {
  deep: {
    iyzipay: { status: CheckStatus; latencyMs: number; error?: string };
    smtp: { status: CheckStatus; error?: string };
    fcm: { status: CheckStatus; error?: string };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private buildSha(): string {
    return process.env.GIT_SHA || 'unknown';
  }

  private async checkDatabase(): Promise<CheckStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch (e) {
      this.logger.warn(`DB health check failed: ${(e as Error).message}`);
      return 'down';
    }
  }

  private async checkCache(): Promise<CheckStatus> {
    const redisConfigured = !!process.env.REDIS_URL?.trim();
    try {
      const key = '__health_ping__';
      await this.cache.set(key, '1', 1000);
      const v = await this.cache.get(key);
      if (v !== '1') {
        return redisConfigured ? 'down' : 'memory-fallback';
      }
      return redisConfigured ? 'ok' : 'memory-fallback';
    } catch {
      return redisConfigured ? 'down' : 'memory-fallback';
    }
  }

  private checkIyzipay(): CheckStatus {
    if (process.env.MOCK_IYZIPAY === '1') return 'mock';
    if (process.env.IYZIPAY_API_KEY && process.env.IYZIPAY_SECRET_KEY) {
      return 'configured';
    }
    return 'missing';
  }

  /**
   * Shallow /health — never calls external services. <50ms target.
   * Suitable for Cloudflare uptime monitor (unauth).
   */
  async getHealth(): Promise<HealthResponse> {
    const [database, cache] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);
    const iyzipay = this.checkIyzipay();

    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (database === 'down') status = 'down';
    else if (cache === 'down' || iyzipay === 'missing') status = 'degraded';

    return {
      status,
      uptime: Math.floor(process.uptime() * 10) / 10,
      version,
      buildSha: this.buildSha(),
      checks: { database, cache, iyzipay },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Deep /health/deep — actually pings external services. Auth-gated.
   * MOCK_IYZIPAY=1 → no live iyzipay call (returns 'mock').
   */
  async getDeepHealth(): Promise<DeepHealthResponse> {
    const shallow = await this.getHealth();

    // Iyzipay deep check — only if configured AND not mocked.
    let iyzipayDeep: { status: CheckStatus; latencyMs: number; error?: string } = {
      status: 'skipped',
      latencyMs: 0,
    };
    if (process.env.MOCK_IYZIPAY === '1') {
      iyzipayDeep = { status: 'mock', latencyMs: 0 };
    } else if (
      process.env.IYZIPAY_API_KEY &&
      process.env.IYZIPAY_SECRET_KEY &&
      process.env.IYZIPAY_URI
    ) {
      const start = Date.now();
      try {
        // Lightweight reachability check — fetch base URI, expect any HTTP response.
        // Real auth-signed calls are too expensive for a health probe.
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(process.env.IYZIPAY_URI, {
          method: 'GET',
          signal: ctrl.signal,
        });
        clearTimeout(t);
        iyzipayDeep = {
          status: res.status < 500 ? 'ok' : 'down',
          latencyMs: Date.now() - start,
        };
      } catch (e) {
        iyzipayDeep = {
          status: 'down',
          latencyMs: Date.now() - start,
          error: (e as Error).message,
        };
      }
    } else {
      iyzipayDeep = { status: 'missing', latencyMs: 0 };
    }

    // SMTP — only verify env presence; real connection probes belong in cron.
    const smtp: { status: CheckStatus; error?: string } =
      process.env.SMTP_HOST && process.env.SMTP_USER
        ? { status: 'configured' }
        : { status: 'missing' };

    // FCM — env presence only.
    const fcm: { status: CheckStatus; error?: string } =
      process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVICE_ACCOUNT
        ? { status: 'configured' }
        : { status: 'missing' };

    return {
      ...shallow,
      deep: { iyzipay: iyzipayDeep, smtp, fcm },
    };
  }
}
