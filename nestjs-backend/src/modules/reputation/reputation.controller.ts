import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReputationService } from './reputation.service';
import { BadgeService } from './badge.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReputationProfileDto } from './dto/reputation-profile.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

/**
 * Phase 165 — Reputation & Badges API
 * Endpoints for submitting reviews, viewing reputation, and managing badges.
 */
@Controller('workers/:workerId/reputation')
export class ReputationController {
  constructor(
    private readonly reputationService: ReputationService,
    private readonly badgeService: BadgeService,
    private readonly reviewsService: ReviewsService,
  ) {}

  /**
   * POST /workers/:workerId/reputation/reviews
   * Submit a review for a worker (must be authenticated customer)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('reviews')
  async submitReview(
    @Param('workerId') workerId: string,
    @Body() dto: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (workerId !== dto.revieweeId) {
      throw new BadRequestException(
        'Review worker ID must match URL parameter',
      );
    }

    if (req.user.id === workerId) {
      throw new BadRequestException('Cannot review yourself');
    }

    // Create review (existing ReviewsService handles the logic)
    const review = await this.reviewsService.create({
      reviewerId: req.user.id,
      revieweeId: workerId,
      jobId: dto.jobId,
      rating: dto.rating,
      comment: dto.comment,
      tenantId: req.user.tenantId,
    });

    // Log reputation change
    const pointsChange = Math.max(1, Math.min(5, dto.rating));
    await this.reputationService.logReputationChange(
      workerId,
      'review',
      pointsChange,
      review.id,
      {
        rating: dto.rating,
        reviewerId: req.user.id,
      },
      req.user.tenantId,
    );

    return review;
  }

  /**
   * GET /workers/:workerId/reputation
   * Get complete reputation profile for a worker
   */
  @Get()
  async getReputationProfile(
    @Param('workerId') workerId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ReputationProfileDto> {
    const profile = await this.reputationService.getReputationProfile(
      workerId,
      req.user?.tenantId,
    );
    return profile as any; // Type cast due to return shape
  }

  /**
   * GET /workers/:workerId/reputation/badges
   * List all active badges for a worker
   */
  @Get('badges')
  async getBadges(
    @Param('workerId') workerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.badgeService.getUserBadges(
      workerId,
      req.user?.tenantId,
    );
  }

  /**
   * GET /workers/:workerId/reputation/history
   * Get reputation change history (audit log) - optional query param ?limit=50
   */
  @Get('history')
  async getReputationHistory(
    @Param('workerId') workerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const limit = Math.min(100, 50); // Default 50, max 100
    return this.reputationService.getReputationHistory(
      workerId,
      limit,
      req.user?.tenantId,
    );
  }

  /**
   * GET /workers/:workerId/reputation/trend
   * Get reputation trend score (change in last 30 days)
   */
  @Get('trend')
  async getTrendScore(
    @Param('workerId') workerId: string,
  ) {
    const trendScore = await this.reputationService.calculateTrendScore(
      workerId,
    );
    return { workerId, trendScore };
  }

  /**
   * POST /workers/:workerId/reputation/badges/check
   * Force check and award eligible badges (admin only - optional)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('badges/check')
  async checkBadges(
    @Param('workerId') workerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // In a full implementation, check if req.user is admin
    // For now, allow any authenticated user to check their own badges
    if (req.user.id !== workerId) {
      throw new BadRequestException('Can only check own badges');
    }

    const awarded = await this.badgeService.checkAndAwardBadges(
      workerId,
      req.user.tenantId,
    );

    return {
      message: 'Badge eligibility checked',
      newlyAwarded: awarded.map((b) => ({ id: b.id, type: b.badgeType })),
    };
  }
}
