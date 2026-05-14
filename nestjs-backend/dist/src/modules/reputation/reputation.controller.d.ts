import { ReputationService } from './reputation.service';
import { BadgeService } from './badge.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReputationProfileDto } from './dto/reputation-profile.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class ReputationController {
    private readonly reputationService;
    private readonly badgeService;
    private readonly reviewsService;
    constructor(reputationService: ReputationService, badgeService: BadgeService, reviewsService: ReviewsService);
    submitReview(workerId: string, dto: CreateReviewDto, req: AuthenticatedRequest): Promise<import("../reviews/review.entity").Review>;
    getReputationProfile(workerId: string, req: AuthenticatedRequest): Promise<ReputationProfileDto>;
    getBadges(workerId: string, req: AuthenticatedRequest): Promise<import("./badge.entity").Badge[]>;
    getReputationHistory(workerId: string, req: AuthenticatedRequest): Promise<import("./reputation.entity").Reputation[]>;
    getTrendScore(workerId: string): Promise<{
        workerId: string;
        trendScore: number;
    }>;
    checkBadges(workerId: string, req: AuthenticatedRequest): Promise<{
        message: string;
        newlyAwarded: {
            id: string;
            type: import("./badge.entity").BadgeType;
        }[];
    }>;
}
