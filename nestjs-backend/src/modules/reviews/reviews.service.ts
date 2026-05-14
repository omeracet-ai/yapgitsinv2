import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { ReviewHelpful } from './review-helpful.entity';
import { UsersService } from '../users/users.service';
import { FraudDetectionService } from '../ai/fraud-detection.service';
import { asUserId } from '../../common/types/branded';

@Injectable()
export class ReviewsService {
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

  /** Phase 212: "faydalı" oyu ekle (kendi reviewine oy veremez, tekrar oy engeli) */
  async markHelpful(reviewId: string, userId: string): Promise<{ helpfulCount: number }> {
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review bulunamadı');
    if (review.reviewerId === userId) throw new ForbiddenException('Kendi yorumunuza faydalı oy veremezsiniz');
    const existing = await this.helpfulRepository.findOne({ where: { reviewId, userId } });
    if (existing) throw new ConflictException('Bu yorumu zaten faydalı buldunuz');
    await this.helpfulRepository.save(this.helpfulRepository.create({ reviewId, userId }));
    const newCount = (review.helpfulCount || 0) + 1;
    await this.reviewsRepository.update(reviewId, { helpfulCount: newCount });
    return { helpfulCount: newCount };
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
