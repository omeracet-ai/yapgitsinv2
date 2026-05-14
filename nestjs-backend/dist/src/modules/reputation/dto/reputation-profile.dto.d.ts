import { BadgeDto } from './badge.dto';
export declare class ReputationProfileDto {
    userId: string;
    averageRating: number;
    totalReviews: number;
    reputationScore: number;
    wilsonScore: number;
    completedJobsAsWorker: number;
    completedJobsAsCustomer: number;
    responseTimeMinutes: number | null;
    badges: BadgeDto[];
    recentReviews: ReviewSummaryDto[];
    trendScore: number;
}
export declare class ReviewSummaryDto {
    id: string;
    rating: number;
    comment: string | null;
    reviewerName: string;
    reviewerImageUrl: string | null;
    createdAt: Date;
    reply: {
        text: string;
        repliedAt: Date;
    } | null;
}
