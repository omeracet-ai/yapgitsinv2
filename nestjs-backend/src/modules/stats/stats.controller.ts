import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { StatsService, PublicStats } from './stats.service';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly statsService: StatsService) {}

  /**
   * Public /stats/public — no auth, 5-minute in-memory cache.
   * Used by homepage SSG + admin dashboard.
   */
  @SkipThrottle()
  @Get('public')
  async getPublic(): Promise<PublicStats> {
    this.logger.debug('GET /stats/public');
    return this.statsService.getPublicStats();
  }
}
