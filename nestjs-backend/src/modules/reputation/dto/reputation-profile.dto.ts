import { BadgeDto } from './badge.dto';

/**
 * Phase 165 — Complete reputation profile for a worker
 */
export class ReputationProfileDto {
  userId: string;

  /** Average rating (1-5 stars, Bayesian-shrunk) */
  averageRating: number;

  /** Total number of reviews */
  totalReviews: number;

  /** Overall reputation score (0+) */
  reputationScore: number;

  /** Wilson score lower bound (for ranking) */
  wilsonScore: number;

  /** Completed jobs as worker */
  completedJobsAsWorker: number;

  /** Completed jobs as customer */
  completedJobsAsCustomer: number;

  /** Average response time in minutes */
  responseTimeMinutes: number | null;

  /** Active badges */
  badges: BadgeDto[];

  /** Recent reviews (last 10) */
  recentReviews: ReviewSummaryDto[];

  /** Reputation trend (last 90 days) */
  trendScore: number;
}

export class ReviewSummaryDto {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  reviewerImageUrl: string | null;
  createdAt: Date;
  reply: { text: string; repliedAt: Date } | null;
}
