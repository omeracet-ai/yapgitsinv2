import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PromoCode,
  PromoAppliesTo,
  PromoDiscountType,
} from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';

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
}

export type UpdatePromoDto = Partial<CreatePromoDto>;

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
    private readonly dataSource: DataSource,
  ) {}

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
}
