import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';
import { SavedJobSearch } from '../favorites/saved-job-search.entity';

@Injectable()
export class SavedSearchAlertService {
  private readonly logger = new Logger(SavedSearchAlertService.name);

  constructor(
    @InjectRepository(SavedJobSearch) private readonly searchRepo: Repository<SavedJobSearch>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runAlerts(): Promise<void> {
    const now = new Date();
    const searches = await this.searchRepo.find();
    let totalMatches = 0;
    let totalNotified = 0;

    for (const search of searches) {
      const since = search.lastNotifiedAt ?? new Date(now.getTime() - 60 * 60 * 1000);
      const c = search.criteria || {};

      const qb = this.jobRepo.createQueryBuilder('job')
        .where('job.createdAt > :since', { since })
        .andWhere('job.status = :status', { status: JobStatus.OPEN })
        .andWhere('job.customerId != :uid', { uid: search.userId });

      if (c.category) {
        qb.andWhere('job.category = :cat', { cat: c.category });
      }
      if (c.city) {
        qb.andWhere('LOWER(job.location) LIKE :city', { city: `%${c.city.toLowerCase()}%` });
      }
      if (typeof c.budgetMin === 'number') {
        qb.andWhere('(job.budgetMax >= :bMin OR job.budgetMax IS NULL)', { bMin: c.budgetMin });
      }
      if (typeof c.budgetMax === 'number') {
        qb.andWhere('(job.budgetMin <= :bMax OR job.budgetMin IS NULL)', { bMax: c.budgetMax });
      }

      const matches = await qb.orderBy('job.createdAt', 'DESC').limit(10).getMany();
      totalMatches += matches.length;

      for (const job of matches) {
        await this.notifRepo.save(
          this.notifRepo.create({
            userId: search.userId,
            type: NotificationType.SAVED_SEARCH_MATCH,
            title: 'Aramana Uyan Yeni İlan',
            body: `"${search.name}" aramana uyan yeni bir ilan: ${job.title}`,
            refId: job.id,
          }),
        );
        totalNotified++;
      }

      search.lastNotifiedAt = now;
      await this.searchRepo.save(search);
    }

    this.logger.log(
      `[SavedSearchAlert] checked ${searches.length} searches, found ${totalMatches} matches, notified ${totalNotified}`,
    );
  }
}
