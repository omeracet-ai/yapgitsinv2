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
exports.BoostService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const boost_entity_1 = require("./boost.entity");
const user_entity_1 = require("../users/user.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
let BoostService = class BoostService {
    boostRepo;
    dataSource;
    constructor(boostRepo, dataSource) {
        this.boostRepo = boostRepo;
        this.dataSource = dataSource;
    }
    getPackages() {
        return boost_entity_1.BOOST_PACKAGES;
    }
    async purchase(userId, type) {
        const pkg = boost_entity_1.BOOST_PACKAGES.find((p) => p.type === type);
        if (!pkg)
            throw new common_1.BadRequestException('Geçersiz boost tipi');
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(user_entity_1.User, { where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('Kullanıcı bulunamadı');
            if (!user.workerCategories || user.workerCategories.length === 0) {
                throw new common_1.BadRequestException('Sadece ustalar boost satın alabilir');
            }
            if (user.tokenBalance < pkg.tokenCost) {
                throw new common_1.BadRequestException(`Yetersiz bakiye. Gerekli: ${pkg.tokenCost}, Mevcut: ${user.tokenBalance}`);
            }
            user.tokenBalance = user.tokenBalance - pkg.tokenCost;
            await manager.save(user_entity_1.User, user);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + pkg.durationHours * 3600 * 1000);
            const boost = await manager.save(boost_entity_1.Boost, manager.create(boost_entity_1.Boost, {
                userId,
                type,
                tokenCost: pkg.tokenCost,
                startsAt: now,
                expiresAt,
                status: boost_entity_1.BoostStatus.ACTIVE,
            }));
            await manager.save(token_transaction_entity_1.TokenTransaction, manager.create(token_transaction_entity_1.TokenTransaction, {
                userId,
                type: token_transaction_entity_1.TxType.SPEND,
                amount: -pkg.tokenCost,
                description: `Boost: ${pkg.name}`,
                status: token_transaction_entity_1.TxStatus.COMPLETED,
                paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                paymentRef: `BOOST-${type}-${boost.id}`,
            }));
            return { boost, newTokenBalance: user.tokenBalance };
        });
    }
    async getMy(userId) {
        const now = new Date();
        const all = await this.boostRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 100,
        });
        const active = all.filter((b) => b.status === boost_entity_1.BoostStatus.ACTIVE && b.expiresAt > now);
        const history = all.filter((b) => !active.includes(b));
        return { active, history };
    }
    async expireExpired() {
        const now = new Date();
        const res = await this.boostRepo.update({ status: boost_entity_1.BoostStatus.ACTIVE, expiresAt: (0, typeorm_2.LessThan)(now) }, { status: boost_entity_1.BoostStatus.EXPIRED });
        return res.affected ?? 0;
    }
    async getActiveBoostsForRanking() {
        const now = new Date();
        const rows = await this.boostRepo
            .createQueryBuilder('b')
            .where('b.status = :s', { s: boost_entity_1.BoostStatus.ACTIVE })
            .andWhere('b.expiresAt > :now', { now })
            .getMany();
        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.userId))
                map.set(r.userId, new Set());
            map.get(r.userId).add(r.type);
        }
        return map;
    }
};
exports.BoostService = BoostService;
exports.BoostService = BoostService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(boost_entity_1.Boost)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], BoostService);
//# sourceMappingURL=boost.service.js.map