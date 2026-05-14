import { DataSource, Repository } from 'typeorm';
import { PromoCode, PromoAppliesTo, PromoDiscountType, PromoEffectType } from './promo-code.entity';
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
export declare class PromoService {
    private readonly promoRepo;
    private readonly redemptionRepo;
    private readonly userRepo;
    private readonly dataSource;
    constructor(promoRepo: Repository<PromoCode>, redemptionRepo: Repository<PromoRedemption>, userRepo: Repository<User>, dataSource: DataSource);
    private computeDiscount;
    validate(code: string, userId: string, spend?: number, repoOverride?: Repository<PromoCode>, redemptionRepoOverride?: Repository<PromoRedemption>): Promise<PromoValidationResult>;
    redeem(code: string, userId: string, refType?: string, refId?: string, spend?: number): Promise<{
        success: true;
        codeId: string;
        appliedAmount: number;
    }>;
    findAll(): Promise<PromoCode[]>;
    findOne(id: string): Promise<PromoCode>;
    create(dto: CreatePromoDto): Promise<PromoCode>;
    update(id: string, dto: UpdatePromoDto): Promise<PromoCode>;
    remove(id: string): Promise<{
        success: true;
    }>;
    redeemByCode(code: string, userId: string): Promise<RedeemEffectResult>;
    adminList(page?: number, limit?: number): Promise<{
        data: PromoCode[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminCreate(dto: AdminCreatePromoDto): Promise<PromoCode>;
    adminUpdate(id: string, dto: AdminUpdatePromoDto): Promise<PromoCode>;
}
