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
exports.PromoService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const promo_code_entity_1 = require("./promo-code.entity");
const promo_redemption_entity_1 = require("./promo-redemption.entity");
const user_entity_1 = require("../users/user.entity");
let PromoService = class PromoService {
    promoRepo;
    redemptionRepo;
    userRepo;
    dataSource;
    constructor(promoRepo, redemptionRepo, userRepo, dataSource) {
        this.promoRepo = promoRepo;
        this.redemptionRepo = redemptionRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    computeDiscount(promo, spend) {
        if (promo.discountType === promo_code_entity_1.PromoDiscountType.PERCENT) {
            const pct = Math.max(0, Math.min(promo.discountValue, 100));
            return +((spend * pct) / 100).toFixed(2);
        }
        return +Math.min(promo.discountValue, spend).toFixed(2);
    }
    async validate(code, userId, spend = 0, repoOverride, redemptionRepoOverride) {
        const repo = repoOverride ?? this.promoRepo;
        const rRepo = redemptionRepoOverride ?? this.redemptionRepo;
        const normalized = (code || '').trim().toUpperCase();
        if (!normalized) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        const promo = await repo.findOne({ where: { code: normalized } });
        if (!promo || !promo.isActive) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        const now = new Date();
        if (promo.validFrom && now < new Date(promo.validFrom)) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        if (promo.validUntil && now > new Date(promo.validUntil)) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        if (promo.maxRedemptions !== null &&
            promo.maxRedemptions !== undefined &&
            promo.redeemedCount >= promo.maxRedemptions) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        if (promo.minSpend && spend < promo.minSpend) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        const existing = await rRepo.findOne({
            where: { codeId: promo.id, userId },
        });
        if (existing) {
            throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
        }
        const computedDiscount = this.computeDiscount(promo, spend);
        return {
            valid: true,
            codeId: promo.id,
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            computedDiscount,
            appliesTo: promo.appliesTo,
        };
    }
    async redeem(code, userId, refType, refId, spend = 0) {
        return this.dataSource.transaction(async (manager) => {
            const promoRepo = manager.getRepository(promo_code_entity_1.PromoCode);
            const redemptionRepo = manager.getRepository(promo_redemption_entity_1.PromoRedemption);
            const result = await this.validate(code, userId, spend, promoRepo, redemptionRepo);
            const redemption = redemptionRepo.create({
                codeId: result.codeId,
                userId,
                appliedAmount: result.computedDiscount,
                refType: refType ?? null,
                refId: refId ?? null,
            });
            await redemptionRepo.save(redemption);
            await promoRepo.increment({ id: result.codeId }, 'redeemedCount', 1);
            return {
                success: true,
                codeId: result.codeId,
                appliedAmount: result.computedDiscount,
            };
        });
    }
    findAll() {
        return this.promoRepo.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const promo = await this.promoRepo.findOne({ where: { id } });
        if (!promo)
            throw new common_1.NotFoundException('Promo kodu bulunamadı');
        return promo;
    }
    async create(dto) {
        if (!dto.code || typeof dto.code !== 'string') {
            throw new common_1.BadRequestException('code zorunlu');
        }
        if (typeof dto.discountValue !== 'number') {
            throw new common_1.BadRequestException('discountValue zorunlu');
        }
        const entity = this.promoRepo.create({
            code: dto.code.trim().toUpperCase(),
            discountType: dto.discountType ?? promo_code_entity_1.PromoDiscountType.PERCENT,
            discountValue: dto.discountValue,
            maxRedemptions: dto.maxRedemptions ?? null,
            minSpend: dto.minSpend ?? null,
            validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            isActive: dto.isActive ?? true,
            description: dto.description ?? null,
            appliesTo: dto.appliesTo ?? promo_code_entity_1.PromoAppliesTo.ALL,
            redeemedCount: 0,
        });
        return this.promoRepo.save(entity);
    }
    async update(id, dto) {
        const promo = await this.findOne(id);
        if (dto.code !== undefined)
            promo.code = dto.code.trim().toUpperCase();
        if (dto.discountType !== undefined)
            promo.discountType = dto.discountType;
        if (dto.discountValue !== undefined)
            promo.discountValue = dto.discountValue;
        if (dto.maxRedemptions !== undefined)
            promo.maxRedemptions = dto.maxRedemptions;
        if (dto.minSpend !== undefined)
            promo.minSpend = dto.minSpend;
        if (dto.validFrom !== undefined)
            promo.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
        if (dto.validUntil !== undefined)
            promo.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
        if (dto.isActive !== undefined)
            promo.isActive = dto.isActive;
        if (dto.description !== undefined)
            promo.description = dto.description;
        if (dto.appliesTo !== undefined)
            promo.appliesTo = dto.appliesTo;
        return this.promoRepo.save(promo);
    }
    async remove(id) {
        const promo = await this.findOne(id);
        await this.promoRepo.remove(promo);
        return { success: true };
    }
    async redeemByCode(code, userId) {
        return this.dataSource.transaction(async (manager) => {
            const promoRepo = manager.getRepository(promo_code_entity_1.PromoCode);
            const redemptionRepo = manager.getRepository(promo_redemption_entity_1.PromoRedemption);
            const userRepo = manager.getRepository(user_entity_1.User);
            const normalized = (code || '').trim().toUpperCase();
            if (!normalized)
                throw new common_1.BadRequestException('Kod geçersiz');
            const promo = await promoRepo.findOne({ where: { code: normalized } });
            if (!promo || !promo.isActive) {
                throw new common_1.BadRequestException('Kod geçersiz veya kullanılmış');
            }
            const now = new Date();
            if (promo.validUntil && now > new Date(promo.validUntil)) {
                throw new common_1.BadRequestException('Kod süresi dolmuş');
            }
            if (promo.maxRedemptions !== null &&
                promo.maxRedemptions !== undefined &&
                promo.redeemedCount >= promo.maxRedemptions) {
                throw new common_1.BadRequestException('Kod kullanım limiti dolmuş');
            }
            const existing = await redemptionRepo.findOne({
                where: { codeId: promo.id, userId },
            });
            if (existing)
                throw new common_1.BadRequestException('Bu kodu zaten kullandınız');
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('Kullanıcı bulunamadı');
            let result;
            const effect = promo.effectType;
            const val = promo.effectValue ?? promo.discountValue ?? 0;
            if (effect === promo_code_entity_1.PromoEffectType.BONUS_TOKEN) {
                user.tokenBalance = Number(user.tokenBalance ?? 0) + val;
                await userRepo.save(user);
                result = {
                    type: promo_code_entity_1.PromoEffectType.BONUS_TOKEN,
                    value: val,
                    message: `${val} token hesabınıza eklendi`,
                };
            }
            else if (effect === promo_code_entity_1.PromoEffectType.DISCOUNT_PERCENT) {
                result = {
                    type: promo_code_entity_1.PromoEffectType.DISCOUNT_PERCENT,
                    value: val,
                    message: `Bir sonraki işleminizde %${val} indirim`,
                };
            }
            else if (effect === promo_code_entity_1.PromoEffectType.DISCOUNT_AMOUNT) {
                result = {
                    type: promo_code_entity_1.PromoEffectType.DISCOUNT_AMOUNT,
                    value: val,
                    message: `Bir sonraki işleminizde ${val}₺ indirim`,
                };
            }
            else if (effect === promo_code_entity_1.PromoEffectType.SUBSCRIPTION_TRIAL) {
                const days = promo.trialDays ?? Math.floor(val) ?? 7;
                result = {
                    type: promo_code_entity_1.PromoEffectType.SUBSCRIPTION_TRIAL,
                    value: days,
                    trialDays: days,
                    message: `${days} günlük abonelik denemesi aktif`,
                };
            }
            else {
                result = {
                    type: 'discount',
                    value: val,
                    message: `İndirim kodu uygulandı`,
                };
            }
            await redemptionRepo.save(redemptionRepo.create({
                codeId: promo.id,
                userId,
                appliedAmount: result.value,
                refType: result.type,
                refId: null,
            }));
            await promoRepo.increment({ id: promo.id }, 'redeemedCount', 1);
            return result;
        });
    }
    async adminList(page = 1, limit = 50) {
        const p = Math.max(1, Math.floor(page));
        const l = Math.max(1, Math.min(100, Math.floor(limit)));
        const [data, total] = await this.promoRepo.findAndCount({
            order: { createdAt: 'DESC' },
            take: l,
            skip: (p - 1) * l,
        });
        return { data, total, page: p, limit: l, pages: Math.max(1, Math.ceil(total / l)) };
    }
    async adminCreate(dto) {
        if (!dto.code)
            throw new common_1.BadRequestException('code zorunlu');
        if (!dto.type)
            throw new common_1.BadRequestException('type zorunlu');
        if (typeof dto.value !== 'number')
            throw new common_1.BadRequestException('value zorunlu');
        const entity = this.promoRepo.create({
            code: dto.code.trim().toUpperCase(),
            effectType: dto.type,
            effectValue: dto.value,
            trialDays: dto.trialDays ?? null,
            maxRedemptions: dto.maxUses ?? null,
            validUntil: dto.expiresAt ? new Date(dto.expiresAt) : null,
            description: dto.description ?? null,
            discountType: promo_code_entity_1.PromoDiscountType.PERCENT,
            discountValue: dto.type === promo_code_entity_1.PromoEffectType.DISCOUNT_PERCENT ? dto.value : 0,
            appliesTo: promo_code_entity_1.PromoAppliesTo.ALL,
            isActive: true,
            redeemedCount: 0,
        });
        return this.promoRepo.save(entity);
    }
    async adminUpdate(id, dto) {
        const promo = await this.findOne(id);
        if (dto.code !== undefined)
            promo.code = dto.code.trim().toUpperCase();
        if (dto.type !== undefined)
            promo.effectType = dto.type;
        if (dto.value !== undefined)
            promo.effectValue = dto.value;
        if (dto.maxUses !== undefined)
            promo.maxRedemptions = dto.maxUses;
        if (dto.expiresAt !== undefined)
            promo.validUntil = dto.expiresAt ? new Date(dto.expiresAt) : null;
        if (dto.description !== undefined)
            promo.description = dto.description;
        if (dto.trialDays !== undefined)
            promo.trialDays = dto.trialDays;
        if (dto.isActive !== undefined)
            promo.isActive = dto.isActive;
        return this.promoRepo.save(promo);
    }
};
exports.PromoService = PromoService;
exports.PromoService = PromoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(promo_code_entity_1.PromoCode)),
    __param(1, (0, typeorm_1.InjectRepository)(promo_redemption_entity_1.PromoRedemption)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], PromoService);
//# sourceMappingURL=promo.service.js.map