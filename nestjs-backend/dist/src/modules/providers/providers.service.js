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
exports.ProvidersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const provider_entity_1 = require("./provider.entity");
const user_entity_1 = require("../users/user.entity");
const badges_util_1 = require("../users/badges.util");
const admin_list_query_dto_1 = require("../admin/dto/admin-list-query.dto");
const rating_1 = require("../../common/utils/rating");
let ProvidersService = class ProvidersService {
    repo;
    usersRepo;
    constructor(repo, usersRepo) {
        this.repo = repo;
        this.usersRepo = usersRepo;
    }
    async findAll() {
        const workers = await this.usersRepo
            .createQueryBuilder('u')
            .where('u.workerCategories IS NOT NULL')
            .andWhere("u.workerCategories != '[]'")
            .andWhere("u.workerCategories != ''")
            .orderBy('u.reputationScore', 'DESC')
            .getMany();
        return Promise.all(workers.map(async (u) => {
            const provider = await this.getOrCreateForUser(u);
            return {
                id: provider.id,
                userId: u.id,
                businessName: provider.businessName || u.fullName,
                bio: provider.bio || u.workerBio || null,
                isVerified: provider.isVerified,
                featuredOrder: provider.featuredOrder,
                documents: provider.documents,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt,
                averageRating: this.calcBayesianRating(u),
                totalReviews: u.totalReviews ?? 0,
                identityVerified: u.identityVerified,
                reputationScore: u.reputationScore ?? 0,
                workerCategories: u.workerCategories ?? [],
                workerSkills: u.workerSkills ?? [],
                asWorkerSuccess: u.asWorkerSuccess ?? 0,
                asWorkerTotal: u.asWorkerTotal ?? 0,
                badges: (0, badges_util_1.computeBadges)(u),
                user: {
                    id: u.id,
                    fullName: u.fullName,
                    email: u.email,
                    phoneNumber: u.phoneNumber,
                    profileImageUrl: u.profileImageUrl,
                    city: u.city,
                },
            };
        }));
    }
    async findAllPaged(q) {
        const { page, limit, skip, take } = (0, admin_list_query_dto_1.normalizePaging)(q);
        const search = q.search?.trim();
        const status = q.status?.trim();
        const qb = this.usersRepo
            .createQueryBuilder('u')
            .where('u.workerCategories IS NOT NULL')
            .andWhere("u.workerCategories != '[]'")
            .andWhere("u.workerCategories != ''");
        if (status === 'verified')
            qb.andWhere('u.identityVerified = :v', { v: true });
        else if (status === 'unverified')
            qb.andWhere('u.identityVerified = :v', { v: false });
        if (search) {
            qb.andWhere(new typeorm_2.Brackets((b) => {
                b.where('LOWER(u.fullName) LIKE LOWER(:s)', { s: `%${search}%` })
                    .orWhere('LOWER(u.email) LIKE LOWER(:s)', { s: `%${search}%` })
                    .orWhere('LOWER(u.phoneNumber) LIKE LOWER(:s)', { s: `%${search}%` });
            }));
        }
        qb.orderBy('u.reputationScore', 'DESC').skip(skip).take(take);
        const [workers, total] = await qb.getManyAndCount();
        const items = await Promise.all(workers.map(async (u) => {
            const provider = await this.getOrCreateForUser(u);
            return {
                id: provider.id,
                userId: u.id,
                businessName: provider.businessName || u.fullName,
                bio: provider.bio || u.workerBio || null,
                isVerified: provider.isVerified,
                featuredOrder: provider.featuredOrder,
                documents: provider.documents,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt,
                averageRating: this.calcBayesianRating(u),
                totalReviews: u.totalReviews ?? 0,
                identityVerified: u.identityVerified,
                reputationScore: u.reputationScore ?? 0,
                workerCategories: u.workerCategories ?? [],
                workerSkills: u.workerSkills ?? [],
                asWorkerSuccess: u.asWorkerSuccess ?? 0,
                asWorkerTotal: u.asWorkerTotal ?? 0,
                badges: (0, badges_util_1.computeBadges)(u),
                user: {
                    id: u.id,
                    fullName: u.fullName,
                    email: u.email,
                    phoneNumber: u.phoneNumber,
                    profileImageUrl: u.profileImageUrl,
                    city: u.city,
                },
            };
        }));
        return (0, admin_list_query_dto_1.buildPaginated)(items, total, page, limit);
    }
    calcBayesianRating(user) {
        const avg = user.averageRating ?? 0;
        const count = user.totalReviews ?? 0;
        if (count === 0)
            return 0;
        const ratings = Array(count).fill(avg);
        return (0, rating_1.bayesianAvg)(ratings, 4.0, 10);
    }
    async getOrCreateForUser(user) {
        let p = await this.repo.findOne({ where: { userId: user.id } });
        if (!p) {
            p = this.repo.create({
                userId: user.id,
                businessName: user.fullName,
                bio: user.workerBio ?? undefined,
                averageRating: user.averageRating ?? 0,
                totalReviews: user.totalReviews ?? 0,
                isVerified: user.identityVerified,
            });
            p = await this.repo.save(p);
        }
        return p;
    }
    async setVerified(id, isVerified) {
        const provider = await this.repo.findOne({ where: { id } });
        if (!provider)
            throw new common_1.NotFoundException('Sağlayıcı bulunamadı');
        await this.repo.update(id, { isVerified });
        await this.usersRepo.update(provider.userId, { identityVerified: isVerified });
        return { ...provider, isVerified };
    }
    async setFeaturedOrder(id, featuredOrder) {
        const provider = await this.repo.findOne({ where: { id } });
        if (!provider)
            throw new common_1.NotFoundException('Sağlayıcı bulunamadı');
        await this.repo.update(id, { featuredOrder });
        return { ...provider, featuredOrder };
    }
};
exports.ProvidersService = ProvidersService;
exports.ProvidersService = ProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(provider_entity_1.Provider)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProvidersService);
//# sourceMappingURL=providers.service.js.map