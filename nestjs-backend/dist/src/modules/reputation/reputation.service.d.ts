import { Repository } from 'typeorm';
import { Reputation } from './reputation.entity';
import { BadgeService } from './badge.service';
import { UsersService } from '../users/users.service';
import { Review } from '../reviews/review.entity';
export declare class ReputationService {
    private reputationRepo;
    private reviewRepo;
    private badgeService;
    private usersService;
    constructor(reputationRepo: Repository<Reputation>, reviewRepo: Repository<Review>, badgeService: BadgeService, usersService: UsersService);
    logReputationChange(userId: string, type: Reputation['type'], pointsChange: number, referenceId?: string, metadata?: Record<string, unknown>, tenantId?: string | null): Promise<Reputation>;
    calculateTimeDecayScore(userId: string): Promise<number>;
    getReputationHistory(userId: string, limit?: number, tenantId?: string | null): Promise<Reputation[]>;
    calculateTrendScore(userId: string): Promise<number>;
    getReputationProfile(userId: string, tenantId?: string | null): Promise<{
        userId: string;
        averageRating: number;
        totalReviews: number;
        reputationScore: number;
        wilsonScore: number;
        completedJobsAsWorker: number;
        completedJobsAsCustomer: number;
        responseTimeMinutes: number | null;
        badges: {
            id: string;
            badgeType: import("./badge.entity").BadgeType;
            displayName: string;
            description: string | null;
            iconUrl: string | null;
            color: string;
            rarity: "common" | "rare" | "epic" | "legendary";
            awardedAt: Date;
        }[];
        recentReviews: {
            id: string;
            rating: number;
            comment: string;
            reviewerName: string;
            reviewerImageUrl: string;
            createdAt: Date;
            reply: {
                text: string;
                repliedAt: Date | null;
            } | null;
        }[];
        trendScore: number;
        timeDecayScore: number;
    }>;
}
