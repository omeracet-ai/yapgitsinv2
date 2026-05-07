import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Not, IsNull, Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';

@Injectable()
export class BoostExpiryService {
  private readonly logger = new Logger(BoostExpiryService.name);

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireBoosts(): Promise<void> {
    const now = new Date();
    const expired = await this.jobRepo.find({
      where: { featuredUntil: LessThan(now) as unknown as Date, featuredOrder: Not(IsNull()) },
    });
    for (const job of expired) {
      job.featuredOrder = null;
      job.featuredUntil = null;
    }
    if (expired.length > 0) {
      await this.jobRepo.save(expired);
    }
    this.logger.log(`[BoostExpiry] expired ${expired.length} jobs`);
  }
}
