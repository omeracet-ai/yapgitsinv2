import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';

@Injectable()
export class ReviewReminderService {
  private readonly logger = new Logger(ReviewReminderService.name);

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Offer) private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  /**
   * Phase 253 (Voldi-db) — N+1 → batched. Old loop ran ~5 queries per job
   * (offer + customer + 2 reviews + 2 notifs); for 200 nightly jobs that's
   * 1000+ round-trips. New flow: 4 IN(...) batch queries total, then
   * in-memory lookup. Same behavior, O(1) DB cost vs O(N).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    const now = Date.now();
    const min = new Date(now - 72 * 60 * 60 * 1000); // 72h ago
    const max = new Date(now - 24 * 60 * 60 * 1000); // 24h ago

    // 1. Batch fetch completed jobs in window, eager-load customer.
    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.COMPLETED, updatedAt: Between(min, max) },
      relations: ['customer'],
    });
    if (jobs.length === 0) {
      this.logger.log('[ReviewReminder] no completed jobs in window');
      return;
    }
    const jobIds = jobs.map((j) => j.id);

    // 2. Batch fetch accepted offers (+ worker user).
    const acceptedOffers = await this.offerRepo.find({
      where: { jobId: In(jobIds), status: OfferStatus.ACCEPTED },
      relations: ['user'],
    });
    const offerByJob = new Map(acceptedOffers.map((o) => [o.jobId, o]));

    // 3. Batch fetch existing reviews + existing reminder notifs for these jobs.
    const [existingReviews, existingNotifs] = await Promise.all([
      this.reviewRepo.find({ where: { jobId: In(jobIds) } }),
      this.notifRepo.find({
        where: {
          type: NotificationType.REVIEW_REMINDER,
          refId: In(jobIds),
        },
      }),
    ]);
    const reviewedKey = new Set(
      existingReviews.map((r) => `${r.jobId}:${r.reviewerId}`),
    );
    const notifiedKey = new Set(
      existingNotifs.map((n) => `${n.refId}:${n.userId}`),
    );

    // 4. Build pending notifications in memory; single bulk save.
    const pending: Partial<Notification>[] = [];
    for (const job of jobs) {
      const offer = offerByJob.get(job.id);
      if (!offer?.userId) continue;
      const workerName = offer.user?.fullName ?? 'Usta';
      const customerName = job.customer?.fullName ?? 'Müşteri';

      const parties: Array<{ userId: string; counterpartName: string }> = [
        { userId: job.customerId, counterpartName: workerName },
        { userId: offer.userId, counterpartName: customerName },
      ];

      for (const p of parties) {
        const rk = `${job.id}:${p.userId}`;
        if (reviewedKey.has(rk)) continue;
        if (notifiedKey.has(rk)) continue;
        pending.push({
          userId: p.userId,
          type: NotificationType.REVIEW_REMINDER,
          title: 'Yorum Yapmayı Unutma',
          body: `${p.counterpartName} ile yaptığın iş için yorum bırakırsan diğer kullanıcılara yardımcı olursun.`,
          refId: job.id,
        });
      }
    }

    if (pending.length > 0) {
      await this.notifRepo.save(pending.map((p) => this.notifRepo.create(p)));
    }

    this.logger.log(
      `[ReviewReminder] checked ${jobs.length} jobs, sent ${pending.length} reminders`,
    );
  }
}
