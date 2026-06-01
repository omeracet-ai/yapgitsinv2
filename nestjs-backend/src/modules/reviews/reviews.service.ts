import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review } from './review.entity';
import { ReviewHelpful } from './review-helpful.entity';
import { UsersService } from '../users/users.service';
import { FraudDetectionService } from '../ai/fraud-detection.service';
import { asUserId } from '../../common/branded.types';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(ReviewHelpful)
    private helpfulRepository: Repository<ReviewHelpful>,
    private usersService: UsersService,
    private fraudDetection: FraudDetectionService,
    private dataSource: DataSource,
  ) {}

  async create(data: Partial<Review>): Promise<Review> {
    // Phase 328 — Review girişini SADECE tamamlanmış iş kapsamına bağla.
    // Job bulunamazsa, COMPLETED değilse, ya da reviewer ↔ reviewee çifti
    // bu iş içindeki iki tarafa (customer + accepted-offer worker) uymuyorsa
    // reddet. Aynı reviewer'ın aynı job+reviewee çifti için ikinci kaydı da
    // engellenir (idempotent).
    if (!data.jobId || !data.reviewerId || !data.revieweeId) {
      throw new BadRequestException(
        'jobId, reviewerId ve revieweeId zorunlu',
      );
    }
    const job = await this.dataSource
      .createQueryBuilder()
      .select(['j.id', 'j.status', 'j.customerId'])
      .from('jobs', 'j')
      .where('j.id = :id', { id: data.jobId })
      .getRawOne<{ j_id: string; j_status: string; j_customerId: string }>();
    if (!job) throw new NotFoundException('İlan bulunamadı');
    if (job.j_status !== 'completed') {
      throw new ForbiddenException(
        'Değerlendirme yalnız tamamlanmış iş üzerinden yapılır',
      );
    }
    // Kabul edilmiş teklif sahibi (worker tarafı) kim?
    const acceptedOffer = await this.dataSource
      .createQueryBuilder()
      .select(['o.userId'])
      .from('offers', 'o')
      .where('o.jobId = :jid AND o.status = :s', {
        jid: data.jobId,
        s: 'accepted',
      })
      .getRawOne<{ o_userId: string }>();
    const customerId = job.j_customerId;
    const workerId = acceptedOffer?.o_userId ?? null;
    const validPair =
      (data.reviewerId === customerId && data.revieweeId === workerId) ||
      (data.reviewerId === workerId && data.revieweeId === customerId);
    if (!validPair) {
      throw new ForbiddenException(
        'Sadece müşteri ↔ usta arası değerlendirme yazılabilir',
      );
    }
    // Aynı reviewer+reviewee+job kombinasyonu için ikinciyi engelle.
    const dup = await this.reviewsRepository.findOne({
      where: {
        jobId: data.jobId,
        reviewerId: data.reviewerId,
        revieweeId: data.revieweeId,
      },
    });
    if (dup) {
      throw new ConflictException('Bu iş için zaten değerlendirme yazdınız');
    }
    const review = this.reviewsRepository.create(data);
    const saved = await this.reviewsRepository.save(review);
    // Değerlendirilen kullanıcının puanını otomatik güncelle
    if (saved.revieweeId && typeof saved.rating === 'number') {
      await this.usersService.recalcRating(
        asUserId(saved.revieweeId),
        saved.rating,
      );
    }
    // Phase 116: fire-and-forget fraud check
    if (saved.comment && saved.comment.trim().length > 0) {
      this.fraudDetection
        .analyzeReview(saved.comment)
        .then(async (r) => {
          if (r.score >= 70) {
            await this.reviewsRepository.update(saved.id, {
              flagged: true,
              flagReason: r.reasons.join('; '),
              fraudScore: r.score,
            });
          } else {
            await this.reviewsRepository.update(saved.id, {
              fraudScore: r.score,
            });
          }
        })
        .catch(() => undefined);
    }
    return saved;
  }

  /** Phase 153/235: Public — en yeni N review, reviewer+reviewee join (fullName+profileImageUrl).
   *
   * Phase 235 defensive rewrite: minimal SELECT via QueryBuilder so missing optional
   * columns (e.g. photos/helpfulCount/flagged) in stale prod schemas do not 500 the
   * endpoint. LEFT JOIN tolerates NULL FK rows. Wrapped in try/catch so any unexpected
   * runtime fault degrades gracefully to an empty list instead of a 500 on a public,
   * homepage-critical path.
   */
  async findRecent(limit: number): Promise<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
      reviewer: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
      reviewee: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
    }>
  > {
    this.logger.warn(`[PHASE236-PROBE] findRecent called with limit=${limit}`);
    const take = Math.min(50, Math.max(1, limit));
    try {
      const rows = await this.reviewsRepository
        .createQueryBuilder('r')
        .select([
          'r.id',
          'r.rating',
          'r.comment',
          'r.createdAt',
          'r.reviewerId',
          'r.revieweeId',
        ])
        .leftJoin('r.reviewer', 'reviewer')
        .addSelect([
          'reviewer.id',
          'reviewer.fullName',
          'reviewer.profileImageUrl',
        ])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect([
          'reviewee.id',
          'reviewee.fullName',
          'reviewee.profileImageUrl',
        ])
        .orderBy('r.createdAt', 'DESC')
        .take(take)
        .getMany();

      return rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        reviewer: r.reviewer
          ? {
              id: r.reviewer.id,
              fullName: r.reviewer.fullName ?? null,
              profileImageUrl: r.reviewer.profileImageUrl ?? null,
            }
          : null,
        reviewee: r.reviewee
          ? {
              id: r.reviewee.id,
              fullName: r.reviewee.fullName ?? null,
              profileImageUrl: r.reviewee.profileImageUrl ?? null,
            }
          : null,
      }));
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `findRecent(${take}) failed: ${e?.message ?? String(err)}`,
        e?.stack,
      );
      // Public homepage endpoint — never 500. Return empty list and surface the
      // root cause in logs (iisnode stderr in prod).
      return [];
    }
  }

  /**
   * Phase 334 — Aktif kullanıcının değerlendirme yazmadığı tamamlanmış
   * işler. Kullanıcı: ya job customer'ı ya da accepted offer worker'ı.
   * SQL JOIN tek sorguda iki tarafı da kapsar; mevcut Review kaydı LEFT
   * JOIN ile elenir. Backend popup için kompakt projeksiyon döner.
   * Son 60 güne kısıtlı (eski tamamlanan işler için "değerlendir" pop-up
   * göstermek anlamsız).
   */
  async findPendingForUser(userId: string): Promise<
    Array<{
      jobId: string;
      jobTitle: string;
      revieweeId: string;
      revieweeName: string;
      completedAt: string;
    }>
  > {
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const rows = await this.dataSource
        .createQueryBuilder()
        .select([
          'j.id           AS "jobId"',
          'j.title        AS "jobTitle"',
          'j.updatedAt    AS "completedAt"',
          // Aktif kullanıcı customer ise reviewee = worker; aksi halde customer.
          `CASE WHEN j.customerId = :uid THEN o.userId ELSE j.customerId END AS "revieweeId"`,
          `CASE WHEN j.customerId = :uid THEN uw.fullName ELSE uc.fullName END AS "revieweeName"`,
        ])
        .from('jobs', 'j')
        .innerJoin('offers', 'o', 'o.jobId = j.id AND o.status = :acc')
        .leftJoin('users', 'uc', 'uc.id = j.customerId')
        .leftJoin('users', 'uw', 'uw.id = o.userId')
        // Mevcut review'ı dış-katıl: yazılmışsa LEFT JOIN sonucu r.id NULL değil.
        .leftJoin(
          'reviews',
          'r',
          'r.jobId = j.id AND r.reviewerId = :uid',
        )
        .where('j.status = :completed', { completed: 'completed' })
        .andWhere('(j.customerId = :uid OR o.userId = :uid)', { uid: userId })
        .andWhere('r.id IS NULL')
        .andWhere('j.updatedAt > :since', { since: sixtyDaysAgo })
        .setParameters({ uid: userId, acc: 'accepted' })
        .orderBy('j.updatedAt', 'DESC')
        .limit(20)
        .getRawMany<{
          jobId: string;
          jobTitle: string;
          revieweeId: string | null;
          revieweeName: string | null;
          completedAt: Date | string;
        }>();
      return rows
        .filter((r) => r.revieweeId && r.jobId)
        .map((r) => ({
          jobId: r.jobId,
          jobTitle: r.jobTitle ?? '',
          revieweeId: r.revieweeId as string,
          revieweeName: r.revieweeName ?? 'Kullanıcı',
          completedAt:
            r.completedAt instanceof Date
              ? r.completedAt.toISOString()
              : String(r.completedAt),
        }));
    } catch (err) {
      const e = err as Error;
      this.logger.warn(
        `findPendingForUser(${userId}) failed: ${e?.message ?? String(err)}`,
      );
      return [];
    }
  }

  /** Phase 238A defensive guard: prod schemas may lack optional columns
   * (replyText/repliedAt/photos/helpfulCount/flagged/flagReason/fraudScore/deletedAt)
   * or contain NULL FK rows. Minimal SELECT + LEFT JOIN + try/catch → never 500.
   * Returns the same minimal projection shape used by findRecent for app/web parity.
   */
  async findByReviewee(revieweeId: string): Promise<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
      reviewer: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
      reviewee: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
    }>
  > {
    try {
      const rows = await this.reviewsRepository
        .createQueryBuilder('r')
        .select([
          'r.id',
          'r.rating',
          'r.comment',
          'r.createdAt',
          'r.reviewerId',
          'r.revieweeId',
        ])
        .leftJoin('r.reviewer', 'reviewer')
        .addSelect([
          'reviewer.id',
          'reviewer.fullName',
          'reviewer.profileImageUrl',
        ])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect([
          'reviewee.id',
          'reviewee.fullName',
          'reviewee.profileImageUrl',
        ])
        .where('r.revieweeId = :revieweeId', { revieweeId })
        .orderBy('r.createdAt', 'DESC')
        .take(100)
        .getMany();

      return rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        reviewer: r.reviewer
          ? {
              id: r.reviewer.id,
              fullName: r.reviewer.fullName ?? null,
              profileImageUrl: r.reviewer.profileImageUrl ?? null,
            }
          : null,
        reviewee: r.reviewee
          ? {
              id: r.reviewee.id,
              fullName: r.reviewee.fullName ?? null,
              profileImageUrl: r.reviewee.profileImageUrl ?? null,
            }
          : null,
      }));
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `findByReviewee(${revieweeId}) failed: ${e?.message ?? String(err)}`,
        e?.stack,
      );
      return [];
    }
  }

  /** Phase 238A defensive guard (see findByReviewee). */
  async findByJob(jobId: string): Promise<
    Array<{
      id: string;
      rating: number;
      comment: string | null;
      createdAt: Date;
      reviewer: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
      reviewee: {
        id: string;
        fullName: string | null;
        profileImageUrl: string | null;
      } | null;
    }>
  > {
    try {
      const rows = await this.reviewsRepository
        .createQueryBuilder('r')
        .select([
          'r.id',
          'r.rating',
          'r.comment',
          'r.createdAt',
          'r.reviewerId',
          'r.revieweeId',
        ])
        .leftJoin('r.reviewer', 'reviewer')
        .addSelect([
          'reviewer.id',
          'reviewer.fullName',
          'reviewer.profileImageUrl',
        ])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect([
          'reviewee.id',
          'reviewee.fullName',
          'reviewee.profileImageUrl',
        ])
        .where('r.jobId = :jobId', { jobId })
        .orderBy('r.createdAt', 'DESC')
        .take(100)
        .getMany();

      return rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt,
        reviewer: r.reviewer
          ? {
              id: r.reviewer.id,
              fullName: r.reviewer.fullName ?? null,
              profileImageUrl: r.reviewer.profileImageUrl ?? null,
            }
          : null,
        reviewee: r.reviewee
          ? {
              id: r.reviewee.id,
              fullName: r.reviewee.fullName ?? null,
              profileImageUrl: r.reviewee.profileImageUrl ?? null,
            }
          : null,
      }));
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `findByJob(${jobId}) failed: ${e?.message ?? String(err)}`,
        e?.stack,
      );
      return [];
    }
  }

  /** Phase 212: review'a fotoğraf ekle (max 3, sadece review sahibi)
   *  Phase 243 (Voldi-db): transaction + pessimistic_write lock — paralel addPhotos
   *  çağrılarında 3 limit'in race ile aşılmasını engeller. SQLite'da pessimistic
   *  lock no-op'tur ama transaction serialization yine de yarış penceresini kapatır.
   *  Postgres/MySQL prod'da gerçek satır kilidi devreye girer. */
  async addPhotos(
    reviewId: string,
    userId: string,
    photoUrls: string[],
  ): Promise<Review> {
    return this.dataSource.transaction(async (manager) => {
      // SQLite lock-mode'u desteklemez; driver throw ederse plain read'e düş.
      // Postgres/MySQL prod'da gerçek satır kilidi devreye girer.
      let review: Review | null;
      try {
        review = await manager.findOne(Review, {
          where: { id: reviewId },
          lock: { mode: 'pessimistic_write' },
        });
      } catch {
        review = await manager.findOne(Review, {
          where: { id: reviewId },
        });
      }
      if (!review) throw new NotFoundException('Review bulunamadı');
      if (review.reviewerId !== userId) {
        throw new ForbiddenException(
          'Sadece review sahibi fotoğraf ekleyebilir',
        );
      }
      const existing = review.photos || [];
      const merged = [...existing, ...photoUrls];
      if (merged.length > 3) {
        throw new BadRequestException('Maksimum 3 fotoğraf eklenebilir');
      }
      review.photos = merged;
      return manager.save(review);
    });
  }

  /** Phase 212: "faydalı" oyu ekle (kendi reviewine oy veremez, tekrar oy engeli)
   *  Phase 240B (Voldi-fs): atomic increment — paralel oy = lost-update fix. */
  async markHelpful(
    reviewId: string,
    userId: string,
  ): Promise<{ helpfulCount: number }> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review bulunamadı');
    if (review.reviewerId === userId)
      throw new ForbiddenException('Kendi yorumunuza faydalı oy veremezsiniz');
    const existing = await this.helpfulRepository.findOne({
      where: { reviewId, userId },
    });
    if (existing)
      throw new ConflictException('Bu yorumu zaten faydalı buldunuz');
    await this.helpfulRepository.save(
      this.helpfulRepository.create({ reviewId, userId }),
    );
    const incResult = await this.reviewsRepository.increment(
      { id: reviewId },
      'helpfulCount',
      1,
    );
    if (!incResult.affected) {
      throw new NotFoundException('Review bulunamadı');
    }
    const fresh = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      select: ['id', 'helpfulCount'],
    });
    return {
      helpfulCount: fresh?.helpfulCount ?? (review.helpfulCount || 0) + 1,
    };
  }

  /** Phase 42: revieweeId yoruma cevap yazar (idempotent edit) */
  async addOrUpdateReply(
    reviewId: string,
    userId: string,
    text: string,
  ): Promise<{ id: string; replyText: string | null; repliedAt: Date | null }> {
    const review = await this.reviewsRepository.findOne({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review bulunamadı');
    }
    if (review.revieweeId !== userId) {
      throw new ForbiddenException(
        'Bu yoruma sadece değerlendirilen kişi cevap verebilir',
      );
    }
    review.replyText = text;
    review.repliedAt = new Date();
    const saved = await this.reviewsRepository.save(review);
    return {
      id: saved.id,
      replyText: saved.replyText,
      repliedAt: saved.repliedAt,
    };
  }
}
