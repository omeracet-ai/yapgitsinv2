import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async create(data: Partial<Review>): Promise<Review> {
    const review = this.reviewsRepository.create(data);
    const saved = await this.reviewsRepository.save(review);
    // Değerlendirilen kullanıcının puanını otomatik güncelle
    if (saved.revieweeId && typeof saved.rating === 'number') {
      await this.usersService.recalcRating(asUserId(saved.revieweeId), saved.rating);
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
            await this.reviewsRepository.update(saved.id, { fraudScore: r.score });
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
  async findRecent(limit: number): Promise<Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    reviewer: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
    reviewee: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
  }>> {
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
        .addSelect(['reviewer.id', 'reviewer.fullName', 'reviewer.profileImageUrl'])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect(['reviewee.id', 'reviewee.fullName', 'reviewee.profileImageUrl'])
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

  /** Phase 238A defensive guard: prod schemas may lack optional columns
   * (replyText/repliedAt/photos/helpfulCount/flagged/flagReason/fraudScore/deletedAt)
   * or contain NULL FK rows. Minimal SELECT + LEFT JOIN + try/catch → never 500.
   * Returns the same minimal projection shape used by findRecent for app/web parity.
   */
  async findByReviewee(revieweeId: string): Promise<Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    reviewer: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
    reviewee: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
  }>> {
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
        .addSelect(['reviewer.id', 'reviewer.fullName', 'reviewer.profileImageUrl'])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect(['reviewee.id', 'reviewee.fullName', 'reviewee.profileImageUrl'])
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
  async findByJob(jobId: string): Promise<Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    reviewer: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
    reviewee: { id: string; fullName: string | null; profileImageUrl: string | null } | null;
  }>> {
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
        .addSelect(['reviewer.id', 'reviewer.fullName', 'reviewer.profileImageUrl'])
        .leftJoin('r.reviewee', 'reviewee')
        .addSelect(['reviewee.id', 'reviewee.fullName', 'reviewee.profileImageUrl'])
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

  /** Phase 212: review'a fotoğraf ekle (max 3, sadece review sahibi) */
  async addPhotos(reviewId: string, userId: string, photoUrls: string[]): Promise<Review> {
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review bulunamadı');
    if (review.reviewerId !== userId) throw new ForbiddenException('Sadece review sahibi fotoğraf ekleyebilir');
    const existing = review.photos || [];
    const merged = [...existing, ...photoUrls].slice(0, 3);
    if (merged.length > 3) throw new BadRequestException('Maksimum 3 fotoğraf eklenebilir');
    review.photos = merged;
    return this.reviewsRepository.save(review);
  }

  /** Phase 212: "faydalı" oyu ekle (kendi reviewine oy veremez, tekrar oy engeli)
   *  Phase 240B (Voldi-fs): atomic increment — paralel oy = lost-update fix. */
  async markHelpful(reviewId: string, userId: string): Promise<{ helpfulCount: number }> {
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review bulunamadı');
    if (review.reviewerId === userId) throw new ForbiddenException('Kendi yorumunuza faydalı oy veremezsiniz');
    const existing = await this.helpfulRepository.findOne({ where: { reviewId, userId } });
    if (existing) throw new ConflictException('Bu yorumu zaten faydalı buldunuz');
    await this.helpfulRepository.save(this.helpfulRepository.create({ reviewId, userId }));
    const incResult = await this.reviewsRepository.increment({ id: reviewId }, 'helpfulCount', 1);
    if (!incResult.affected) {
      throw new NotFoundException('Review bulunamadı');
    }
    const fresh = await this.reviewsRepository.findOne({
      where: { id: reviewId },
      select: ['id', 'helpfulCount'],
    });
    return { helpfulCount: fresh?.helpfulCount ?? (review.helpfulCount || 0) + 1 };
  }

  /** Phase 42: revieweeId yoruma cevap yazar (idempotent edit) */
  async addOrUpdateReply(
    reviewId: string,
    userId: string,
    text: string,
  ): Promise<{ id: string; replyText: string | null; repliedAt: Date | null }> {
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review bulunamadı');
    }
    if (review.revieweeId !== userId) {
      throw new ForbiddenException('Bu yoruma sadece değerlendirilen kişi cevap verebilir');
    }
    review.replyText = text;
    review.repliedAt = new Date();
    const saved = await this.reviewsRepository.save(review);
    return { id: saved.id, replyText: saved.replyText, repliedAt: saved.repliedAt };
  }
}
