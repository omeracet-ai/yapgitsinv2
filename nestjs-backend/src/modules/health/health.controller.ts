import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  HealthService,
  HealthResponse,
  DeepHealthResponse,
} from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Public /health — no auth, <50ms, no external calls.
   * For Cloudflare/uptime probes.
   */
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
}
