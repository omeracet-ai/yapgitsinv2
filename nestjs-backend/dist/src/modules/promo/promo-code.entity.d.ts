export declare enum PromoDiscountType {
    PERCENT = "percent",
    FIXED = "fixed"
}
export declare enum PromoAppliesTo {
    TOKENS = "tokens",
    OFFER = "offer",
    ALL = "all"
}
export declare enum PromoEffectType {
    BONUS_TOKEN = "bonus_token",
    DISCOUNT_PERCENT = "discount_percent",
    DISCOUNT_AMOUNT = "discount_amount",
    SUBSCRIPTION_TRIAL = "subscription_trial"
}
export declare class PromoCode {
    id: string;
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    maxRedemptions: number | null;
    redeemedCount: number;
    minSpend: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
    isActive: boolean;
    description: string | null;
    appliesTo: PromoAppliesTo;
    effectType: PromoEffectType | null;
    effectValue: number | null;
    trialDays: number | null;
    createdAt: Date;
    updatedAt: Date;
}
