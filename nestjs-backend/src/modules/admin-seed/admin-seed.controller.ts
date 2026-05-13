import {
  Controller,
  Post,
  Query,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminSeedService } from './admin-seed.service';

/**
 * Admin seed endpoints — BOOTSTRAP MODE.
 *
 * SAFETY: Every endpoint is gated SOLELY by `ALLOW_SEED=1` env flag.
 * Admin JWT auth requirement has been intentionally removed so the seed can
 * be invoked when the prod admin password is out of sync with `.env` (the
 * chicken-and-egg case where login would otherwise be impossible).
 *
 * Production usage:
 *   1. set ALLOW_SEED=1 in .env
 *   2. restart backend
 *   3. curl -X POST .../admin/seed/wipe-and-populate?count=...
 *   4. set ALLOW_SEED=0 (or remove) in .env
 *   5. restart backend
 *
 * A per-IP throttle (5 req/min) limits accidental or malicious flooding while
 * the gate is open.
 */
@Controller('admin/seed')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AdminSeedController {
  constructor(private readonly seed: AdminSeedService) {}

  private assertEnabled(): void {
    if (process.env.ALLOW_SEED !== '1') {
      throw new ForbiddenException(
        'Seeding disabled (set ALLOW_SEED=1 and restart)',
      );
    }
  }

  private clampCount(count: number): number {
    if (!Number.isFinite(count) || count < 1) return 1;
    return Math.min(count, 200);
  }

  private warning(): string {
    return 'ALLOW_SEED is active — disable in production after one-shot use';
  }

  @Post('wipe')
  async wipe() {
    this.assertEnabled();
    const t0 = Date.now();
    const wiped = await this.seed.wipeAll();
    return { wiped, durationMs: Date.now() - t0, warning: this.warning() };
  }

  @Post('populate')
  async populate(
    @Query('count', new DefaultValuePipe(50), ParseIntPipe) count: number,
  ) {
    this.assertEnabled();
    const t0 = Date.now();
    const created = await this.seed.populate(this.clampCount(count));
    return { created, durationMs: Date.now() - t0, warning: this.warning() };
  }

  @Post('wipe-and-populate')
  async wipeAndPopulate(
    @Query('count', new DefaultValuePipe(50), ParseIntPipe) count: number,
  ) {
    this.assertEnabled();
    const t0 = Date.now();
    const result = await this.seed.wipeAndPopulate(this.clampCount(count));
    return { ...result, durationMs: Date.now() - t0, warning: this.warning() };
  }
}
