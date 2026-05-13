import {
  Controller,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminSeedService } from './admin-seed.service';

/**
 * Admin-only seed endpoints.
 *
 * SAFETY: Every endpoint is gated by `ALLOW_SEED=1` env flag.
 * Production usage: set ALLOW_SEED=1 → restart → call → unset → restart.
 */
@Controller('admin/seed')
@SkipThrottle({ default: true, 'auth-login': true, 'auth-register': true, uploads: true })
@UseGuards(AuthGuard('jwt'), AdminGuard)
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

  @Post('wipe')
  async wipe() {
    this.assertEnabled();
    const t0 = Date.now();
    const wiped = await this.seed.wipeAll();
    return { wiped, durationMs: Date.now() - t0 };
  }

  @Post('populate')
  async populate(
    @Query('count', new DefaultValuePipe(50), ParseIntPipe) count: number,
  ) {
    this.assertEnabled();
    const t0 = Date.now();
    const created = await this.seed.populate(this.clampCount(count));
    return { created, durationMs: Date.now() - t0 };
  }

  @Post('wipe-and-populate')
  async wipeAndPopulate(
    @Query('count', new DefaultValuePipe(50), ParseIntPipe) count: number,
  ) {
    this.assertEnabled();
    const t0 = Date.now();
    const result = await this.seed.wipeAndPopulate(this.clampCount(count));
    return { ...result, durationMs: Date.now() - t0 };
  }
}
