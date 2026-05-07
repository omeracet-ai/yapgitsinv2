import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    const now = Date.now();
    const min = new Date(now - 72 * 60 * 60 * 1000); // 72h ago
    const max = new Date(now - 24 * 60 * 60 * 1000); // 24h ago

    // Job entity'de completedAt yok — updatedAt kullanılıyor (status=completed iken son güncelleme = bitiş anı)
    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.COMPLETED, updatedAt: Between(min, max) },
    });

    let sent = 0;
    for (const job of jobs) {
      // Kabul edilen offer'dan worker'ı bul
      const accepted = await this.offerRepo.findOne({
        where: { jobId: job.id, status: OfferStatus.ACCEPTED },
        relations: ['user'],
      });
      const workerId = accepted?.userId;
      if (!workerId) continue;

      const customer = await this.jobRepo.manager.findOne(Job, {
        where: { id: job.id },
        relations: ['customer'],
      });
      const customerName = customer?.customer?.fullName ?? 'Müşteri';
      const workerName = accepted?.user?.fullName ?? 'Usta';

      const parties: Array<{ userId: string; counterpartName: string }> = [
        { userId: job.customerId, counterpartName: workerName },
        { userId: workerId, counterpartName: customerName },
      ];

      for (const p of parties) {
        // Zaten review yazmış mı?
        const existingReview = await this.reviewRepo.findOne({
          where: { jobId: job.id, reviewerId: p.userId },
        });
        if (existingReview) continue;

        // Zaten reminder gönderilmiş mi?
        const existingNotif = await this.notifRepo.findOne({
          where: {
            userId: p.userId,
            type: NotificationType.REVIEW_REMINDER,
            refId: job.id,
          },
        });
        if (existingNotif) continue;

        await this.notifRepo.save(
          this.notifRepo.create({
            userId: p.userId,
            type: NotificationType.REVIEW_REMINDER,
            title: 'Yorum Yapmayı Unutma',
            body: `${p.counterpartName} ile yaptığın iş için yorum bırakırsan diğer kullanıcılara yardımcı olursun.`,
            refId: job.id,
          }),
        );
        sent++;
      }
    }

    this.logger.log(`[ReviewReminder] checked ${jobs.length} jobs, sent ${sent} reminders`);
  }
}
