import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  HealthService,
  HealthResponse,
  DeepHealthResponse,
  DbHealthDetail,
} from './health.service';

// Cached at module load — read package.json version once, then re-use.
// Resolved relative to APP_ROOT to survive iisnode's quirky cwd.
import { join } from 'path';
import { APP_ROOT } from '../../common/paths';
let PKG_VERSION: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PKG_VERSION = require(join(APP_ROOT, 'package.json')).version;
} catch {
  PKG_VERSION = undefined;
}

interface HealthzResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
  version?: string;
}

/**
 * Kubernetes-style /healthz liveness probe.
 * Public, throttler-skipped, zero DI, <50ms. Separate from `/health` so
 * uptime monitors hit a route that cannot regress when health.service grows.
 */
@ApiTags('health')
@Controller('healthz')
export class HealthzController {
  @SkipThrottle({ short: true, medium: true, long: true, default: true })
  @Get()
  get(): HealthzResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: PKG_VERSION,
    };
  }
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Public /health — no auth, <50ms, no external calls.
   * For Cloudflare/uptime probes.
   * P191/5 — @SkipThrottle: CF uptime monitor hits this every 30s and we
   * don't want it competing with real traffic on the global tiers.
   */
  @SkipThrottle({ short: true, medium: true, long: true, default: true })
  @Get()
  get(): Promise<HealthResponse> {
    return this.health.getHealth();
  }

  /**
   * Deep /health/deep — admin-only, throttled to 1/min, makes external pings.
   */
  @Get('deep')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth('JWT-auth')
  // 5/min — tighter than default 60/min but allows operator burst when investigating.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  getDeep(): Promise<DeepHealthResponse> {
    return this.health.getDeepHealth();
  }

  /**
   * P222 — /health/db — admin-only DB hardening report.
   * Returns WAL mode, FK status, busy timeout, index counts, on-disk size.
   * Use this after deploy to verify PRAGMA boot hardening took effect.
   */
  @Get('db')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getDb(): Promise<DbHealthDetail> {
    return this.health.getDbHealth();
  }
}
