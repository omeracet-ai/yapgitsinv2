import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { UsersService } from '../users/users.service';
import { FraudDetectionService } from '../ai/fraud-detection.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private usersService: UsersService,
    private fraudDetection: FraudDetectionService,
  ) {}

  async create(data: Partial<Review>): Promise<Review> {
    const review = this.reviewsRepository.create(data);
    const saved = await this.reviewsRepository.save(review);
    // Değerlendirilen kullanıcının puanını otomatik güncelle
    if (saved.revieweeId && typeof saved.rating === 'number') {
      await this.usersService.recalcRating(saved.revieweeId, saved.rating);
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

  async findByReviewee(revieweeId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { revieweeId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByJob(jobId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { jobId },
      relations: ['reviewer', 'reviewee'],
      order: { createdAt: 'DESC' },
    });
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
