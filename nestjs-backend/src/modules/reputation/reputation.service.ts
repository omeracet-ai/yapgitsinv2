import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Reputation } from './reputation.entity';
import { BadgeService } from './badge.service';
import { UsersService } from '../users/users.service';
import { Review } from '../reviews/review.entity';

/**
 * Phase 165 — Reputation Service
 * Manages reputation scoring, time-decay calculations, and audit logging.
 *
 * Time-decay algorithm:
 * - Recent ratings weight more heavily (last 90 days)
 * - Older ratings gradually lose influence
 * - Formula: base_score * (1 - decay_factor * days_ago / 90)
 *
 * Reputation = Bayesian-weighted average + job success bonus
 */
@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(Reputation)
    private reputationRepo: Repository<Reputation>,
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    private badgeService: BadgeService,
    private usersService: UsersService,
  ) {}

  /**
   * Log a reputation change event
   */
  async logReputationChange(
    userId: string,
    type: Reputation['type'],
    pointsChange: number,
    referenceId?: string,
    metadata?: Record<string, unknown>,
    tenantId?: string | null,
  ): Promise<Reputation> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const previousScore = user.reputationScore || 0;
    const newScore = Math.max(0, previousScore + pointsChange);

    const reputation = this.reputationRepo.create({
      userId,
      type,
      referenceId,
      pointsChange,
      previousScore,
      newScore,
      metadata,
      tenantId,
    });

    const saved = await this.reputationRepo.save(reputation);

    // Update user's reputation score (uses existing recalcReputation)
    // The actual score will be recalculated by recalcRating/recalcReputation

    // Check for badge eligibility
    await this.badgeService.checkAndAwardBadges(userId, tenantId);

    return saved;
  }

  /**
   * Calculate time-decay weighted reputation for a user.
   * Recent reviews (< 30 days) = 100% weight
   * 30-60 days = 75% weight
   * 60-90 days = 50% weight
   * 90+ days = 25% weight
   */
  async calculateTimeDecayScore(userId: string): Promise<number> {
    const reviews = await this.reviewRepo.find({
      where: { revieweeId: userId },
      order: { createdAt: 'DESC' },
    });

    if (reviews.length === 0) return 0;

    const now = new Date();
    let weightedSum = 0;
    let weightSum = 0;

    for (const review of reviews) {
      const daysAgo = Math.floor(
        (now.getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate weight based on age
      let weight = 1;
      if (daysAgo > 90) {
        weight = 0.25;
      } else if (daysAgo > 60) {
        weight = 0.5;
      } else if (daysAgo > 30) {
        weight = 0.75;
      }
      // else: < 30 days = 1.0

      weightedSum += review.rating * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  /**
   * Get reputation change history for audit/transparency
   */
  async getReputationHistory(
    userId: string,
    limit = 50,
    tenantId?: string | null,
  ): Promise<Reputation[]> {
    const query = this.reputationRepo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .orderBy('r.createdAt', 'DESC')
      .take(limit);

    if (tenantId) {
      query.andWhere('r.tenantId = :tenantId', { tenantId });
    }

    return query.getMany();
  }

  /**
   * Calculate trend score (positive change in last 30 days)
   */
  async calculateTrendScore(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const changes = await this.reputationRepo.find({
      where: {
        userId,
        createdAt: MoreThan(thirtyDaysAgo),
      },
    });

    if (changes.length === 0) return 0;

    const totalChange = changes.reduce((sum, c) => sum + c.pointsChange, 0);
    return totalChange;
  }

  /**
   * Get complete reputation profile for a user
   */
  async getReputationProfile(userId: string, tenantId?: string | null) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const timeDecayScore = await this.calculateTimeDecayScore(userId);
    const trendScore = await this.calculateTrendScore(userId);
    const badges = await this.badgeService.getUserBadges(userId, tenantId);

    const recentReviews = await this.reviewRepo.find({
      where: { revieweeId: userId },
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      userId,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews,
      reputationScore: user.reputationScore,
      wilsonScore: user.wilsonScore,
      completedJobsAsWorker: user.asWorkerSuccess,
      completedJobsAsCustomer: user.asCustomerSuccess,
      responseTimeMinutes: user.responseTimeMinutes,
      badges: badges.map((b) => ({
        id: b.id,
        badgeType: b.badgeType,
        displayName: b.displayName,
        description: b.description,
        iconUrl: b.iconUrl,
        color: b.color,
        rarity: b.rarity,
        awardedAt: b.awardedAt,
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reviewerName: r.reviewer?.fullName,
        reviewerImageUrl: r.reviewer?.profileImageUrl,
        createdAt: r.createdAt,
        reply: r.replyText
          ? { text: r.replyText, repliedAt: r.repliedAt }
          : null,
      })),
      trendScore,
      timeDecayScore: Math.round(timeDecayScore * 100) / 100,
    };
  }
}
