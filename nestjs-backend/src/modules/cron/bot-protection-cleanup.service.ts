import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotProtectionService } from '../bot-protection/bot-protection.service';

/**
 * Phase 441 — daily cleanup of expired IP blocks.
 *
 * Runs at 03:30 server time (off-peak). Failures are logged but don't throw.
 */
@Injectable()
export class BotProtectionCleanupService {
  private readonly logger = new Logger(BotProtectionCleanupService.name);

  constructor(private readonly bots: BotProtectionService) {}

  @Cron('30 3 * * *')
  async purgeExpired(): Promise<void> {
    try {
      const n = await this.bots.purgeExpired();
      if (n > 0) this.logger.log(`Purged ${n} expired IP block(s)`);
    } catch (err) {
      this.logger.warn(`purgeExpired cron failed: ${(err as Error).message}`);
    }
  }
}
