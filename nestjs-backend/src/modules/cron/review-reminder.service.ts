import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Job, JobStatus } from '../jobs/job.entity';
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import {
  Notification,
  NotificationType,
} from '../notifications/notification.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class ReviewReminderService {
  private readonly logger = new Logger(ReviewReminderService.name);

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @InjectRepository(Offer) private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    // Phase 332 — 10-dakikalık hatırlatmayı e-posta olarak da gönderir.
    private readonly emailService: EmailService,
  ) {}

  /**
   * Phase 332 — Dakikada bir koşar; iş tamamlandıktan 10-11 dk sonra
   * (1-dk pencere) hâlâ değerlendirme yazmamış iki tarafa push + e-posta
   * hatırlatması gönderir. Idempotent: `notifRepo` üzerinden
   * `REVIEW_REMINDER` tipli kayıt zaten varsa atlanır (mevcut 24-72h
   * cron'u ile çakışmaz; ikisi de aynı `refId+userId` benzersizliğine
   * dayanır).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendImmediate10MinReminders(): Promise<void> {
    const now = Date.now();
    const min = new Date(now - 11 * 60 * 1000); // 11 dk önce
    const max = new Date(now - 10 * 60 * 1000); // 10 dk önce
    const jobs = await this.jobRepo.find({
      where: { status: JobStatus.COMPLETED, updatedAt: Between(min, max) },
      relations: ['customer'],
    });
    if (jobs.length === 0) return;
    const jobIds = jobs.map((j) => j.id);
    const acceptedOffers = await this.offerRepo.find({
      where: { jobId: In(jobIds), status: OfferStatus.ACCEPTED },
      relations: ['user'],
    });
    const offerByJob = new Map(acceptedOffers.map((o) => [o.jobId, o]));
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

    const pending: Partial<Notification>[] = [];
    const emailJobs: Array<{ email: string; jobTitle: string; counterpartName: string }> = [];
    for (const job of jobs) {
      const offer = offerByJob.get(job.id);
      if (!offer?.userId) continue;
      const workerName = offer.user?.fullName ?? 'Usta';
      const customerName = job.customer?.fullName ?? 'Müşteri';
      const parties: Array<{
        userId: string;
        email: string | null | undefined;
        counterpartName: string;
      }> = [
        {
          userId: job.customerId,
          email: job.customer?.email,
          counterpartName: workerName,
        },
        {
          userId: offer.userId,
          email: offer.user?.email,
          counterpartName: customerName,
        },
      ];
      for (const p of parties) {
        const rk = `${job.id}:${p.userId}`;
        if (reviewedKey.has(rk) || notifiedKey.has(rk)) continue;
        pending.push({
          userId: p.userId,
          type: NotificationType.REVIEW_REMINDER,
          title: 'Değerlendirme zamanı 💬',
          body: `${p.counterpartName} ile yaptığınız işi değerlendirin. Birkaç dakikanızı alır.`,
          refId: job.id,
        });
        if (p.email) {
          emailJobs.push({
            email: p.email,
            jobTitle: job.title,
            counterpartName: p.counterpartName,
          });
        }
      }
    }
    if (pending.length > 0) {
      await this.notifRepo.save(pending.map((p) => this.notifRepo.create(p)));
    }
    // E-posta best-effort, paralel; başarısızlık logla atlamayalım.
    await Promise.all(
      emailJobs.map(({ email, jobTitle, counterpartName }) => {
        const html =
          `<h2>Değerlendirme Zamanı</h2>` +
          `<p><b>${jobTitle}</b> başlıklı iş için ${counterpartName} ile çalışmanızı değerlendirir misiniz?</p>` +
          `<p>Uygulamaya girip kısa bir yorum + yıldız bırakmanız yeterli.</p>` +
          `<p style="color:#6b7280;font-size:12px">Yapgitsin · ${new Date().toLocaleString('tr-TR')}</p>`;
        return this.emailService
          .send(email, 'Değerlendirme bekliyor — Yapgitsin', html)
          .catch((e) =>
            this.logger.warn(`10min review email failed: ${String(e)}`),
          );
      }),
    );
    this.logger.log(
      `[ReviewReminder10m] jobs=${jobs.length} notifs=${pending.length} emails=${emailJobs.length}`,
    );
  }

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
