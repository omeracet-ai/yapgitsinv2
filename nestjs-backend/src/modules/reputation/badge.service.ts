import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from './badge.entity';
import { UsersService } from '../users/users.service';

/**
 * Phase 165 — Badge Service
 * Automatically awards and manages achievement badges based on reputation metrics.
 *
 * Badge Types:
 * - verified: Account verified (manual or ID check)
 * - top_rated: Average rating >= 4.5 with 10+ reviews
 * - fast_responder: Average response time < 2 hours
 * - reliable: 50+ completed jobs with zero cancellations
 * - expert: Category-specific high ratings (>=4.8 average)
 * - newcomer: New account with 5+ reviews (auto-revoked after 3 months)
 * - power_tasker: 100+ completed jobs with 95%+ success rate
 */
@Injectable()
export class BadgeService {
  private readonly BADGE_DEFINITIONS = {
    verified: {
      displayName: 'Verified',
      description: 'Account identity verified',
      color: 'green',
      rarity: 'common' as const,
    },
    top_rated: {
      displayName: 'Top Rated',
      description: 'Maintains high average rating (4.5+)',
      color: 'gold',
      rarity: 'rare' as const,
    },
    fast_responder: {
      displayName: 'Fast Responder',
      description: 'Responds to requests within 2 hours',
      color: 'blue',
      rarity: 'common' as const,
    },
    reliable: {
      displayName: 'Reliable',
      description: '50+ completed jobs with excellent track record',
      color: 'purple',
      rarity: 'epic' as const,
    },
    expert: {
      displayName: 'Expert',
      description: 'Specialized expertise in a category (4.8+ avg)',
      color: 'orange',
      rarity: 'epic' as const,
    },
    newcomer: {
      displayName: 'Newcomer',
      description: 'New to the platform but already earning trust',
      color: 'silver',
      rarity: 'common' as const,
    },
    power_tasker: {
      displayName: 'Power Tasker',
      description: '100+ completed jobs with 95%+ success rate',
      color: 'red',
      rarity: 'legendary' as const,
    },
  };

  constructor(
    @InjectRepository(Badge)
    private badgeRepo: Repository<Badge>,
    private usersService: UsersService,
  ) {}

  /**
   * Check and award badges based on current reputation metrics
   */
  async checkAndAwardBadges(userId: string, tenantId?: string | null): Promise<Badge[]> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new NotFoundException('User not found');

    const awardedBadges: Badge[] = [];

    // Check verified badge
    if (user.identityVerified && !(await this.hasBadge(userId, 'verified'))) {
      awardedBadges.push(await this.awardBadge(userId, 'verified', tenantId));
    }

    // Check top_rated badge (avg >= 4.5, total >= 10)
    if (
      user.averageRating >= 4.5 &&
      user.totalReviews >= 10 &&
      !(await this.hasBadge(userId, 'top_rated'))
    ) {
      awardedBadges.push(await this.awardBadge(userId, 'top_rated', tenantId));
    }

    // Check fast_responder badge (response < 120 minutes)
    if (
      user.responseTimeMinutes &&
      user.responseTimeMinutes < 120 &&
      !(await this.hasBadge(userId, 'fast_responder'))
    ) {
      awardedBadges.push(await this.awardBadge(userId, 'fast_responder', tenantId));
    }

    // Check reliable badge (50+ jobs, minimal cancellations)
    const completedJobs = user.asWorkerSuccess || 0;
    const totalJobs = user.asWorkerTotal || 0;
    const cancellationRate = totalJobs > 0 ? 1 - completedJobs / totalJobs : 1;

    if (
      completedJobs >= 50 &&
      cancellationRate < 0.05 &&
      !(await this.hasBadge(userId, 'reliable'))
    ) {
      awardedBadges.push(await this.awardBadge(userId, 'reliable', tenantId));
    }

    // Check power_tasker badge (100+ jobs, 95%+ success)
    if (
      completedJobs >= 100 &&
      totalJobs > 0 &&
      completedJobs / totalJobs >= 0.95 &&
      !(await this.hasBadge(userId, 'power_tasker'))
    ) {
      awardedBadges.push(await this.awardBadge(userId, 'power_tasker', tenantId));
    }

    // Check newcomer badge (5+ reviews, account < 3 months)
    const accountAgeMonths =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (
      user.totalReviews >= 5 &&
      accountAgeMonths < 3 &&
      !(await this.hasBadge(userId, 'newcomer'))
    ) {
      awardedBadges.push(await this.awardBadge(userId, 'newcomer', tenantId));
    }

    // Revoke newcomer after 3 months
    if (accountAgeMonths >= 3) {
      await this.revokeBadge(userId, 'newcomer', 'Account no longer new (3+ months old)');
    }

    return awardedBadges;
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userId: string, badgeType: string, tenantId?: string | null): Promise<Badge> {
    const def = this.BADGE_DEFINITIONS[badgeType as keyof typeof this.BADGE_DEFINITIONS];
    if (!def) {
      throw new Error(`Unknown badge type: ${badgeType}`);
    }

    const badge = this.badgeRepo.create({
      userId,
      badgeType,
      displayName: def.displayName,
      description: def.description,
      color: def.color,
      rarity: def.rarity,
      tenantId,
      active: true,
      criteria: {
        awardedAt: new Date().toISOString(),
        automatic: true,
      },
    });

    return this.badgeRepo.save(badge);
  }

  /**
   * Revoke a badge from a user
   */
  async revokeBadge(userId: string, badgeType: string, reason: string): Promise<void> {
    await this.badgeRepo.update(
      { userId, badgeType, active: true },
      {
        active: false,
        revokedReason: reason,
        revokedAt: new Date(),
      },
    );
  }

  /**
   * Check if user has a specific badge
   */
  async hasBadge(userId: string, badgeType: string): Promise<boolean> {
    const count = await this.badgeRepo.count({
      where: { userId, badgeType, active: true },
    });
    return count > 0;
  }

  /**
   * Get all active badges for a user
   */
  async getUserBadges(userId: string, tenantId?: string | null): Promise<Badge[]> {
    const query = this.badgeRepo
      .createQueryBuilder('b')
      .where('b.userId = :userId', { userId })
      .andWhere('b.active = :active', { active: true })
      .orderBy('b.rarity', 'DESC')
      .addOrderBy('b.awardedAt', 'DESC');

    if (tenantId) {
      query.andWhere('b.tenantId = :tenantId', { tenantId });
    }

    return query.getMany();
  }

  /**
   * Get all badges (for admin/reference)
   */
  async getAllBadgesMetadata(): Promise<Record<string, unknown>> {
    return this.BADGE_DEFINITIONS;
  }
}
