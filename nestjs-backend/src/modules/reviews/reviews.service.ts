import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private usersService: UsersService,
  ) {}

  async create(data: Partial<Review>): Promise<Review> {
    const review = this.reviewsRepository.create(data);
    const saved = await this.reviewsRepository.save(review);
    // Değerlendirilen kullanıcının puanını otomatik güncelle
    if (saved.revieweeId && typeof saved.rating === 'number') {
      await this.usersService.recalcRating(saved.revieweeId, saved.rating);
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
}
