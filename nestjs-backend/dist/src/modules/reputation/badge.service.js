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
exports.BadgeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const badge_entity_1 = require("./badge.entity");
const users_service_1 = require("../users/users.service");
let BadgeService = class BadgeService {
    badgeRepo;
    usersService;
    BADGE_DEFINITIONS = {
        verified: {
            displayName: 'Verified',
            description: 'Account identity verified',
            color: 'green',
            rarity: 'common',
        },
        top_rated: {
            displayName: 'Top Rated',
            description: 'Maintains high average rating (4.5+)',
            color: 'gold',
            rarity: 'rare',
        },
        fast_responder: {
            displayName: 'Fast Responder',
            description: 'Responds to requests within 2 hours',
            color: 'blue',
            rarity: 'common',
        },
        reliable: {
            displayName: 'Reliable',
            description: '50+ completed jobs with excellent track record',
            color: 'purple',
            rarity: 'epic',
        },
        expert: {
            displayName: 'Expert',
            description: 'Specialized expertise in a category (4.8+ avg)',
            color: 'orange',
            rarity: 'epic',
        },
        newcomer: {
            displayName: 'Newcomer',
            description: 'New to the platform but already earning trust',
            color: 'silver',
            rarity: 'common',
        },
        power_tasker: {
            displayName: 'Power Tasker',
            description: '100+ completed jobs with 95%+ success rate',
            color: 'red',
            rarity: 'legendary',
        },
    };
    constructor(badgeRepo, usersService) {
        this.badgeRepo = badgeRepo;
        this.usersService = usersService;
    }
    async checkAndAwardBadges(userId, tenantId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const awardedBadges = [];
        if (user.identityVerified && !(await this.hasBadge(userId, 'verified'))) {
            awardedBadges.push(await this.awardBadge(userId, 'verified', tenantId));
        }
        if (user.averageRating >= 4.5 &&
            user.totalReviews >= 10 &&
            !(await this.hasBadge(userId, 'top_rated'))) {
            awardedBadges.push(await this.awardBadge(userId, 'top_rated', tenantId));
        }
        if (user.responseTimeMinutes &&
            user.responseTimeMinutes < 120 &&
            !(await this.hasBadge(userId, 'fast_responder'))) {
            awardedBadges.push(await this.awardBadge(userId, 'fast_responder', tenantId));
        }
        const completedJobs = user.asWorkerSuccess || 0;
        const totalJobs = user.asWorkerTotal || 0;
        const cancellationRate = totalJobs > 0 ? 1 - completedJobs / totalJobs : 1;
        if (completedJobs >= 50 &&
            cancellationRate < 0.05 &&
            !(await this.hasBadge(userId, 'reliable'))) {
            awardedBadges.push(await this.awardBadge(userId, 'reliable', tenantId));
        }
        if (completedJobs >= 100 &&
            totalJobs > 0 &&
            completedJobs / totalJobs >= 0.95 &&
            !(await this.hasBadge(userId, 'power_tasker'))) {
            awardedBadges.push(await this.awardBadge(userId, 'power_tasker', tenantId));
        }
        const accountAgeMonths = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (user.totalReviews >= 5 &&
            accountAgeMonths < 3 &&
            !(await this.hasBadge(userId, 'newcomer'))) {
            awardedBadges.push(await this.awardBadge(userId, 'newcomer', tenantId));
        }
        if (accountAgeMonths >= 3) {
            await this.revokeBadge(userId, 'newcomer', 'Account no longer new (3+ months old)');
        }
        return awardedBadges;
    }
    async awardBadge(userId, badgeType, tenantId) {
        const def = this.BADGE_DEFINITIONS[badgeType];
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
    async revokeBadge(userId, badgeType, reason) {
        await this.badgeRepo.update({ userId, badgeType, active: true }, {
            active: false,
            revokedReason: reason,
            revokedAt: new Date(),
        });
    }
    async hasBadge(userId, badgeType) {
        const count = await this.badgeRepo.count({
            where: { userId, badgeType, active: true },
        });
        return count > 0;
    }
    async getUserBadges(userId, tenantId) {
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
    async getAllBadgesMetadata() {
        return this.BADGE_DEFINITIONS;
    }
};
exports.BadgeService = BadgeService;
exports.BadgeService = BadgeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(badge_entity_1.Badge)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService])
], BadgeService);
//# sourceMappingURL=badge.service.js.map