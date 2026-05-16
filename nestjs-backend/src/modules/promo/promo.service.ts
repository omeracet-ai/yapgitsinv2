import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PromoCode,
  PromoAppliesTo,
  PromoDiscountType,
  PromoEffectType,
} from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';
import { User } from '../users/user.entity';

export interface CreatePromoDto {
  code: string;
  discountType?: PromoDiscountType;
  discountValue: number;
  maxRedemptions?: number | null;
  minSpend?: number | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  isActive?: boolean;
  description?: string | null;
  appliesTo?: PromoAppliesTo;
  effectType?: PromoEffectType | null;
  effectValue?: number | null;
  trialDays?: number | null;
}

export type UpdatePromoDto = Partial<CreatePromoDto>;

// Phase 126: simplified admin DTO (spec shape)
export interface AdminCreatePromoDto {
  code: string;
  type: PromoEffectType;
  value: number;
  maxUses?: number | null;
  expiresAt?: Date | string | null;
  description?: string | null;
  trialDays?: number | null;
}
export type AdminUpdatePromoDto = Partial<AdminCreatePromoDto> & {
  isActive?: boolean;
};

export interface RedeemEffectResult {
  type: PromoEffectType | 'discount';
  value: number;
  message: string;
  trialDays?: number;
}

export interface PromoValidationResult {
  valid: true;
  codeId: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  computedDiscount: number;
  appliesTo: PromoAppliesTo;
}

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoRedemption)
    private readonly redemptionRepo: Repository<PromoRedemption>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /** Phase 153: Public — aktif promolar, kod metni hariç */
  async listPublic(): Promise<Array<{
    id: string;
    title: string | null;
    description: string | null;
    discountType: PromoDiscountType;
    discountValue: number;
    validUntil: Date | null;
    minPurchase: number | null;
  }>> {
    const now = new Date();
    const rows = await this.promoRepo
      .createQueryBuilder('p')
      .where('p.isActive = :a', { a: true })
      .andWhere('(p.validUntil IS NULL OR p.validUntil > :now)', { now })
      .orderBy('p.createdAt', 'DESC')
      .limit(50)
      .getMany();
    return rows.map((p) => ({
      id: p.id,
      title: p.description ?? null,
      description: p.description ?? null,
      discountType: p.discountType,
      discountValue: Number(p.discountValue),
      validUntil: p.validUntil,
      minPurchase: p.minSpend != null ? Number(p.minSpend) : null,
    }));
  }

  private computeDiscount(promo: PromoCode, spend: number): number {
    if (promo.discountType === PromoDiscountType.PERCENT) {
      const pct = Math.max(0, Math.min(promo.discountValue, 100));
      return +((spend * pct) / 100).toFixed(2);
    }
    return +Math.min(promo.discountValue, spend).toFixed(2);
  }

  async validate(
    code: string,
    userId: string,
    spend = 0,
    repoOverride?: Repository<PromoCode>,
    redemptionRepoOverride?: Repository<PromoRedemption>,
  ): Promise<PromoValidationResult> {
    const repo = repoOverride ?? this.promoRepo;
    const rRepo = redemptionRepoOverride ?? this.redemptionRepo;
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    const promo = await repo.findOne({ where: { code: normalized } });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    const now = new Date();
    if (promo.validFrom && now < new Date(promo.validFrom)) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    if (promo.validUntil && now > new Date(promo.validUntil)) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    if (
      promo.maxRedemptions !== null &&
      promo.maxRedemptions !== undefined &&
      promo.redeemedCount >= promo.maxRedemptions
    ) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    if (promo.minSpend && spend < promo.minSpend) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
    }
    const existing = await rRepo.findOne({
      where: { codeId: promo.id, userId },
    });
    if (existing) {
      throw new BadRequestException('Kod geçersiz veya kullanılmış');
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

  async redeem(
    code: string,
    userId: string,
    refType?: string,
    refId?: string,
    spend = 0,
  ): Promise<{ success: true; codeId: string; appliedAmount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const promoRepo = manager.getRepository(PromoCode);
      const redemptionRepo = manager.getRepository(PromoRedemption);
      const result = await this.validate(
        code,
        userId,
        spend,
        promoRepo,
        redemptionRepo,
      );
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

  findAll(): Promise<PromoCode[]> {
    return this.promoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PromoCode> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo kodu bulunamadı');
    return promo;
  }

  async create(dto: CreatePromoDto): Promise<PromoCode> {
    if (!dto.code || typeof dto.code !== 'string') {
      throw new BadRequestException('code zorunlu');
    }
    if (typeof dto.discountValue !== 'number') {
      throw new BadRequestException('discountValue zorunlu');
    }
    const entity = this.promoRepo.create({
      code: dto.code.trim().toUpperCase(),
      discountType: dto.discountType ?? PromoDiscountType.PERCENT,
      discountValue: dto.discountValue,
      maxRedemptions: dto.maxRedemptions ?? null,
      minSpend: dto.minSpend ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: dto.isActive ?? true,
      description: dto.description ?? null,
      appliesTo: dto.appliesTo ?? PromoAppliesTo.ALL,
      redeemedCount: 0,
    });
    return this.promoRepo.save(entity);
  }

  async update(id: string, dto: UpdatePromoDto): Promise<PromoCode> {
    const promo = await this.findOne(id);
    if (dto.code !== undefined) promo.code = dto.code.trim().toUpperCase();
    if (dto.discountType !== undefined) promo.discountType = dto.discountType;
    if (dto.discountValue !== undefined) promo.discountValue = dto.discountValue;
    if (dto.maxRedemptions !== undefined) promo.maxRedemptions = dto.maxRedemptions;
    if (dto.minSpend !== undefined) promo.minSpend = dto.minSpend;
    if (dto.validFrom !== undefined)
      promo.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined)
      promo.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;
    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.appliesTo !== undefined) promo.appliesTo = dto.appliesTo;
    return this.promoRepo.save(promo);
  }

  async remove(id: string): Promise<{ success: true }> {
    const promo = await this.findOne(id);
    await this.promoRepo.remove(promo);
    return { success: true };
  }

  // ── Phase 126 ────────────────────────────────────────────────
  async redeemByCode(code: string, userId: string): Promise<RedeemEffectResult> {
    return this.dataSource.transaction(async (manager) => {
      const promoRepo = manager.getRepository(PromoCode);
      const redemptionRepo = manager.getRepository(PromoRedemption);
      const userRepo = manager.getRepository(User);
      const normalized = (code || '').trim().toUpperCase();
      if (!normalized) throw new BadRequestException('Kod geçersiz');
      const promo = await promoRepo.findOne({ where: { code: normalized } });
      if (!promo || !promo.isActive) {
        throw new BadRequestException('Kod geçersiz veya kullanılmış');
      }
      const now = new Date();
      if (promo.validUntil && now > new Date(promo.validUntil)) {
        throw new BadRequestException('Kod süresi dolmuş');
      }
      if (
        promo.maxRedemptions !== null &&
        promo.maxRedemptions !== undefined &&
        promo.redeemedCount >= promo.maxRedemptions
      ) {
        throw new BadRequestException('Kod kullanım limiti dolmuş');
      }
      const existing = await redemptionRepo.findOne({
        where: { codeId: promo.id, userId },
      });
      if (existing) throw new BadRequestException('Bu kodu zaten kullandınız');

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

      let result: RedeemEffectResult;
      const effect = promo.effectType;
      const val = promo.effectValue ?? promo.discountValue ?? 0;

      if (effect === PromoEffectType.BONUS_TOKEN) {
        // Phase 240C (Voldi-fs): atomic increment — paralel redeem = lost-update fix.
        await userRepo.increment({ id: userId }, 'tokenBalance', val);
        result = {
          type: PromoEffectType.BONUS_TOKEN,
          value: val,
          message: `${val} token hesabınıza eklendi`,
        };
      } else if (effect === PromoEffectType.DISCOUNT_PERCENT) {
        result = {
          type: PromoEffectType.DISCOUNT_PERCENT,
          value: val,
          message: `Bir sonraki işleminizde %${val} indirim`,
        };
      } else if (effect === PromoEffectType.DISCOUNT_AMOUNT) {
        result = {
          type: PromoEffectType.DISCOUNT_AMOUNT,
          value: val,
          message: `Bir sonraki işleminizde ${val}₺ indirim`,
        };
      } else if (effect === PromoEffectType.SUBSCRIPTION_TRIAL) {
        const days = promo.trialDays ?? Math.floor(val) ?? 7;
        result = {
          type: PromoEffectType.SUBSCRIPTION_TRIAL,
          value: days,
          trialDays: days,
          message: `${days} günlük abonelik denemesi aktif`,
        };
      } else {
        // Legacy discount-only promo
        result = {
          type: 'discount',
          value: val,
          message: `İndirim kodu uygulandı`,
        };
      }

      await redemptionRepo.save(
        redemptionRepo.create({
          codeId: promo.id,
          userId,
          appliedAmount: result.value,
          refType: result.type,
          refId: null,
        }),
      );
      await promoRepo.increment({ id: promo.id }, 'redeemedCount', 1);
      return result;
    });
  }

  async adminList(page = 1, limit = 50): Promise<{ data: PromoCode[]; total: number; page: number; limit: number; pages: number }> {
    const p = Math.max(1, Math.floor(page));
    const l = Math.max(1, Math.min(100, Math.floor(limit)));
    const [data, total] = await this.promoRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: l,
      skip: (p - 1) * l,
    });
    return { data, total, page: p, limit: l, pages: Math.max(1, Math.ceil(total / l)) };
  }

  async adminCreate(dto: AdminCreatePromoDto): Promise<PromoCode> {
    if (!dto.code) throw new BadRequestException('code zorunlu');
    if (!dto.type) throw new BadRequestException('type zorunlu');
    if (typeof dto.value !== 'number') throw new BadRequestException('value zorunlu');
    const entity = this.promoRepo.create({
      code: dto.code.trim().toUpperCase(),
      effectType: dto.type,
      effectValue: dto.value,
      trialDays: dto.trialDays ?? null,
      maxRedemptions: dto.maxUses ?? null,
      validUntil: dto.expiresAt ? new Date(dto.expiresAt) : null,
      description: dto.description ?? null,
      // legacy required fields
      discountType: PromoDiscountType.PERCENT,
      discountValue: dto.type === PromoEffectType.DISCOUNT_PERCENT ? dto.value : 0,
      appliesTo: PromoAppliesTo.ALL,
      isActive: true,
      redeemedCount: 0,
    });
    return this.promoRepo.save(entity);
  }

  async adminUpdate(id: string, dto: AdminUpdatePromoDto): Promise<PromoCode> {
    const promo = await this.findOne(id);
    if (dto.code !== undefined) promo.code = dto.code.trim().toUpperCase();
    if (dto.type !== undefined) promo.effectType = dto.type;
    if (dto.value !== undefined) promo.effectValue = dto.value;
    if (dto.maxUses !== undefined) promo.maxRedemptions = dto.maxUses;
    if (dto.expiresAt !== undefined)
      promo.validUntil = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.description !== undefined) promo.description = dto.description;
    if (dto.trialDays !== undefined) promo.trialDays = dto.trialDays;
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;
    return this.promoRepo.save(promo);
  }
}
