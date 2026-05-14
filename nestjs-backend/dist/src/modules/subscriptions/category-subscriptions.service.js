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
var CategorySubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_subscription_entity_1 = require("./category-subscription.entity");
let CategorySubscriptionsService = CategorySubscriptionsService_1 = class CategorySubscriptionsService {
    repo;
    logger = new common_1.Logger(CategorySubscriptionsService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async listMine(userId) {
        return this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async create(userId, category, city) {
        if (!category || !category.trim()) {
            throw new common_1.BadRequestException('category zorunlu');
        }
        const cat = category.trim();
        const c = city?.trim() || null;
        const existing = await this.repo.findOne({
            where: { userId, category: cat, city: c ?? (0, typeorm_2.IsNull)() },
        });
        if (existing) {
            throw new common_1.ConflictException('Bu abonelik zaten var');
        }
        const sub = this.repo.create({
            userId,
            category: cat,
            city: c,
            alertEnabled: true,
        });
        return this.repo.save(sub);
    }
    async remove(id, userId) {
        const sub = await this.repo.findOne({ where: { id } });
        if (!sub)
            throw new common_1.NotFoundException('Abonelik bulunamadı');
        if (sub.userId !== userId) {
            throw new common_1.ForbiddenException('Bu abonelik size ait değil');
        }
        await this.repo.delete(id);
        return { ok: true };
    }
    async findMatches(category, location) {
        if (!category)
            return [];
        const subs = await this.repo
            .createQueryBuilder('s')
            .where('s.alertEnabled = :en', { en: true })
            .andWhere('LOWER(s.category) = LOWER(:cat)', { cat: category })
            .getMany();
        if (!location)
            return subs;
        const loc = location.toLowerCase();
        return subs.filter((s) => {
            if (!s.city)
                return true;
            return loc.includes(s.city.toLowerCase());
        });
    }
    async markNotified(id) {
        await this.repo.update(id, { lastNotifiedAt: new Date() });
    }
};
exports.CategorySubscriptionsService = CategorySubscriptionsService;
exports.CategorySubscriptionsService = CategorySubscriptionsService = CategorySubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_subscription_entity_1.CategorySubscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategorySubscriptionsService);
//# sourceMappingURL=category-subscriptions.service.js.map