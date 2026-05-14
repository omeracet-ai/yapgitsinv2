"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const reputation_entity_1 = require("./reputation.entity");
const badge_service_1 = require("./badge.service");
const users_service_1 = require("../users/users.service");
const review_entity_1 = require("../reviews/review.entity");
let ReputationService = class ReputationService {
    reputationRepo;
    reviewRepo;
    badgeService;
    usersService;
    constructor(reputationRepo, reviewRepo, badgeService, usersService) {
        this.reputationRepo = reputationRepo;
        this.reviewRepo = reviewRepo;
        this.badgeService = badgeService;
        this.usersService = usersService;
    }
    async logReputationChange(userId, type, pointsChange, referenceId, metadata, tenantId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
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
        await this.badgeService.checkAndAwardBadges(userId, tenantId);
        return saved;
    }
    async calculateTimeDecayScore(userId) {
        const reviews = await this.reviewRepo.find({
            where: { revieweeId: userId },
            order: { createdAt: 'DESC' },
        });
        if (reviews.length === 0)
            return 0;
        const now = new Date();
        let weightedSum = 0;
        let weightSum = 0;
        for (const review of reviews) {
            const daysAgo = Math.floor((now.getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            let weight = 1;
            if (daysAgo > 90) {
                weight = 0.25;
            }
            else if (daysAgo > 60) {
                weight = 0.5;
            }
            else if (daysAgo > 30) {
                weight = 0.75;
            }
            weightedSum += review.rating * weight;
            weightSum += weight;
        }
        return weightSum > 0 ? weightedSum / weightSum : 0;
    }
    async getReputationHistory(userId, limit = 50, tenantId) {
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
    async calculateTrendScore(userId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const changes = await this.reputationRepo.find({
            where: {
                userId,
                createdAt: (0, typeorm_2.MoreThan)(thirtyDaysAgo),
            },
        });
        if (changes.length === 0)
            return 0;
        const totalChange = changes.reduce((sum, c) => sum + c.pointsChange, 0);
        return totalChange;
    }
    async getReputationProfile(userId, tenantId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
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
};
exports.ReputationService = ReputationService;
exports.ReputationService = ReputationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reputation_entity_1.Reputation)),
    __param(1, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        badge_service_1.BadgeService,
        users_service_1.UsersService])
], ReputationService);
//# sourceMappingURL=reputation.service.js.map