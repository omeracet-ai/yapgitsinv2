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
exports.ReputationController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const reputation_service_1 = require("./reputation.service");
const badge_service_1 = require("./badge.service");
const reviews_service_1 = require("../reviews/reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
let ReputationController = class ReputationController {
    reputationService;
    badgeService;
    reviewsService;
    constructor(reputationService, badgeService, reviewsService) {
        this.reputationService = reputationService;
        this.badgeService = badgeService;
        this.reviewsService = reviewsService;
    }
    async submitReview(workerId, dto, req) {
        if (workerId !== dto.revieweeId) {
            throw new common_1.BadRequestException('Review worker ID must match URL parameter');
        }
        if (req.user.id === workerId) {
            throw new common_1.BadRequestException('Cannot review yourself');
        }
        const review = await this.reviewsService.create({
            reviewerId: req.user.id,
            revieweeId: workerId,
            jobId: dto.jobId,
            rating: dto.rating,
            comment: dto.comment,
            tenantId: req.user.tenantId,
        });
        const pointsChange = Math.max(1, Math.min(5, dto.rating));
        await this.reputationService.logReputationChange(workerId, 'review', pointsChange, review.id, {
            rating: dto.rating,
            reviewerId: req.user.id,
        }, req.user.tenantId);
        return review;
    }
    async getReputationProfile(workerId, req) {
        const profile = await this.reputationService.getReputationProfile(workerId, req.user?.tenantId);
        return profile;
    }
    async getBadges(workerId, req) {
        return this.badgeService.getUserBadges(workerId, req.user?.tenantId);
    }
    async getReputationHistory(workerId, req) {
        const limit = Math.min(100, 50);
        return this.reputationService.getReputationHistory(workerId, limit, req.user?.tenantId);
    }
    async getTrendScore(workerId) {
        const trendScore = await this.reputationService.calculateTrendScore(workerId);
        return { workerId, trendScore };
    }
    async checkBadges(workerId, req) {
        if (req.user.id !== workerId) {
            throw new common_1.BadRequestException('Can only check own badges');
        }
        const awarded = await this.badgeService.checkAndAwardBadges(workerId, req.user.tenantId);
        return {
            message: 'Badge eligibility checked',
            newlyAwarded: awarded.map((b) => ({ id: b.id, type: b.badgeType })),
        };
    }
};
exports.ReputationController = ReputationController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('reviews'),
    __param(0, (0, common_1.Param)('workerId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_review_dto_1.CreateReviewDto, Object]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "submitReview", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('workerId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "getReputationProfile", null);
__decorate([
    (0, common_1.Get)('badges'),
    __param(0, (0, common_1.Param)('workerId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "getBadges", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Param)('workerId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "getReputationHistory", null);
__decorate([
    (0, common_1.Get)('trend'),
    __param(0, (0, common_1.Param)('workerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "getTrendScore", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('badges/check'),
    __param(0, (0, common_1.Param)('workerId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReputationController.prototype, "checkBadges", null);
exports.ReputationController = ReputationController = __decorate([
    (0, common_1.Controller)('workers/:workerId/reputation'),
    __metadata("design:paramtypes", [reputation_service_1.ReputationService,
        badge_service_1.BadgeService,
        reviews_service_1.ReviewsService])
], ReputationController);
//# sourceMappingURL=reputation.controller.js.map