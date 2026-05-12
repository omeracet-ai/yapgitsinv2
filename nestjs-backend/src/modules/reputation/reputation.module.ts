import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reputation } from './reputation.entity';
import { Badge } from './badge.entity';
import { Review } from '../reviews/review.entity';
import { ReputationService } from './reputation.service';
import { BadgeService } from './badge.service';
import { ReputationController } from './reputation.controller';
import { UsersModule } from '../users/users.module';
import { ReviewsModule } from '../reviews/reviews.module';

/**
 * Phase 165 — Reputation & Badges Module
 * Manages worker reputation, achievement badges, and audit logging.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Reputation, Badge, Review]),
    forwardRef(() => UsersModule),
    forwardRef(() => ReviewsModule),
  ],
  controllers: [ReputationController],
  providers: [ReputationService, BadgeService],
  exports: [ReputationService, BadgeService],
})
export class ReputationModule {}
