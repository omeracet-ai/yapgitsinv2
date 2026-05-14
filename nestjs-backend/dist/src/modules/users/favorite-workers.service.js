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
exports.FavoriteWorkersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const favorite_worker_entity_1 = require("./favorite-worker.entity");
const user_entity_1 = require("./user.entity");
let FavoriteWorkersService = class FavoriteWorkersService {
    favRepo;
    userRepo;
    constructor(favRepo, userRepo) {
        this.favRepo = favRepo;
        this.userRepo = userRepo;
    }
    async addFavorite(userId, workerId) {
        if (workerId === userId) {
            throw new common_1.BadRequestException('Cannot favorite yourself');
        }
        const worker = await this.userRepo.findOne({
            where: { id: workerId },
            select: ['id'],
        });
        if (!worker)
            throw new common_1.NotFoundException('Worker not found');
        try {
            await this.favRepo.insert({ userId, workerId });
        }
        catch {
        }
        return { favorited: true, workerId };
    }
    async removeFavorite(userId, workerId) {
        await this.favRepo.delete({ userId, workerId });
        return { favorited: false, workerId };
    }
    async listFavorites(userId) {
        const rows = await this.favRepo
            .createQueryBuilder('f')
            .innerJoinAndSelect('f.worker', 'w')
            .where('f.userId = :userId', { userId })
            .orderBy('f.createdAt', 'DESC')
            .getMany();
        const data = rows.map((f) => {
            const w = f.worker;
            return {
                id: w.id,
                fullName: w.fullName,
                profileImageUrl: w.profileImageUrl ?? null,
                workerCategories: w.workerCategories ?? null,
                city: w.city ?? null,
                district: w.district ?? null,
                averageRating: w.averageRating ?? 0,
                totalReviews: w.totalReviews ?? 0,
                reputationScore: w.reputationScore ?? 0,
                identityVerified: w.identityVerified ?? false,
                hourlyRateMin: w.hourlyRateMin ?? null,
                hourlyRateMax: w.hourlyRateMax ?? null,
                isAvailable: w.isAvailable ?? false,
                favoritedAt: f.createdAt,
            };
        });
        return { data, total: data.length };
    }
};
exports.FavoriteWorkersService = FavoriteWorkersService;
exports.FavoriteWorkersService = FavoriteWorkersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(favorite_worker_entity_1.FavoriteWorker)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FavoriteWorkersService);
//# sourceMappingURL=favorite-workers.service.js.map