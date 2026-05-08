import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BoostService } from '../boost/boost.service';

@Injectable()
export class WorkerBoostExpiryService {
  private readonly logger = new Logger(WorkerBoostExpiryService.name);

  constructor(private readonly boostSvc: BoostService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const n = await this.boostSvc.expireExpired();
    if (n > 0) this.logger.log(`[WorkerBoostExpiry] expired ${n} boosts`);
  }
}
