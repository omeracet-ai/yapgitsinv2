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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const favorite_provider_entity_1 = require("./favorite-provider.entity");
const saved_job_search_entity_1 = require("./saved-job-search.entity");
const user_entity_1 = require("../users/user.entity");
let FavoritesService = class FavoritesService {
    favRepo;
    searchRepo;
    userRepo;
    constructor(favRepo, searchRepo, userRepo) {
        this.favRepo = favRepo;
        this.searchRepo = searchRepo;
        this.userRepo = userRepo;
    }
    async listFavoriteProviders(userId) {
        const favs = await this.favRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
        if (favs.length === 0)
            return [];
        const providerIds = favs.map((f) => f.providerId);
        const providers = await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: providerIds })
            .getMany();
        const byId = new Map(providers.map((p) => [p.id, p]));
        return favs.map((f) => {
            const p = byId.get(f.providerId);
            return {
                id: f.id,
                providerId: f.providerId,
                notes: f.notes,
                createdAt: f.createdAt,
                provider: p
                    ? {
                        id: p.id,
                        fullName: p.fullName,
                        profileImageUrl: p.profileImageUrl ?? null,
                        averageRating: p.averageRating ?? 0,
                        totalReviews: p.totalReviews ?? 0,
                        identityVerified: p.identityVerified ?? false,
                        workerCategories: p.workerCategories ?? null,
                    }
                    : null,
            };
        });
    }
    async addFavoriteProvider(userId, providerId, notes) {
        if (!providerId) {
            throw new common_1.BadRequestException('providerId required');
        }
        if (providerId === userId) {
            throw new common_1.BadRequestException('Cannot favorite yourself');
        }
        const provider = await this.userRepo.findOne({ where: { id: providerId } });
        if (!provider) {
            throw new common_1.NotFoundException('Provider not found');
        }
        const existing = await this.favRepo.findOne({
            where: { userId, providerId },
        });
        if (existing) {
            if (notes !== undefined) {
                existing.notes = notes ?? null;
                return this.favRepo.save(existing);
            }
            return existing;
        }
        const fav = this.favRepo.create({
            userId,
            providerId,
            notes: notes ?? null,
        });
        return this.favRepo.save(fav);
    }
    async removeFavoriteProvider(userId, providerId) {
        const result = await this.favRepo.delete({ userId, providerId });
        return { removed: (result.affected ?? 0) > 0 };
    }
    async listSavedSearches(userId) {
        return this.searchRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async createSavedSearch(userId, name, criteria, alertEnabled) {
        if (!name || name.trim().length === 0) {
            throw new common_1.BadRequestException('name required');
        }
        if (!criteria || typeof criteria !== 'object') {
            throw new common_1.BadRequestException('criteria required');
        }
        const entity = this.searchRepo.create({
            userId,
            name: name.trim().slice(0, 100),
            criteria,
            ...(alertEnabled !== undefined ? { alertEnabled } : {}),
        });
        return this.searchRepo.save(entity);
    }
    async updateSavedSearch(userId, id, patch) {
        const entity = await this.searchRepo.findOne({ where: { id } });
        if (!entity)
            throw new common_1.NotFoundException('Saved search not found');
        if (entity.userId !== userId) {
            throw new common_1.ForbiddenException('Not your saved search');
        }
        if (patch.name !== undefined) {
            const trimmed = patch.name.trim();
            if (trimmed.length === 0) {
                throw new common_1.BadRequestException('name cannot be empty');
            }
            entity.name = trimmed.slice(0, 100);
        }
        if (patch.criteria !== undefined) {
            entity.criteria = patch.criteria;
        }
        return this.searchRepo.save(entity);
    }
    async deleteSavedSearch(userId, id) {
        const entity = await this.searchRepo.findOne({ where: { id } });
        if (!entity)
            throw new common_1.NotFoundException('Saved search not found');
        if (entity.userId !== userId) {
            throw new common_1.ForbiddenException('Not your saved search');
        }
        await this.searchRepo.delete({ id });
        return { deleted: true };
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(favorite_provider_entity_1.FavoriteProvider)),
    __param(1, (0, typeorm_1.InjectRepository)(saved_job_search_entity_1.SavedJobSearch)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map