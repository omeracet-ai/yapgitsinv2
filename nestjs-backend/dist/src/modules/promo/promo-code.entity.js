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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromoCode = exports.PromoEffectType = exports.PromoAppliesTo = exports.PromoDiscountType = void 0;
const typeorm_1 = require("typeorm");
const decimal_transformer_1 = require("../../common/transformers/decimal.transformer");
var PromoDiscountType;
(function (PromoDiscountType) {
    PromoDiscountType["PERCENT"] = "percent";
    PromoDiscountType["FIXED"] = "fixed";
})(PromoDiscountType || (exports.PromoDiscountType = PromoDiscountType = {}));
var PromoAppliesTo;
(function (PromoAppliesTo) {
    PromoAppliesTo["TOKENS"] = "tokens";
    PromoAppliesTo["OFFER"] = "offer";
    PromoAppliesTo["ALL"] = "all";
})(PromoAppliesTo || (exports.PromoAppliesTo = PromoAppliesTo = {}));
var PromoEffectType;
(function (PromoEffectType) {
    PromoEffectType["BONUS_TOKEN"] = "bonus_token";
    PromoEffectType["DISCOUNT_PERCENT"] = "discount_percent";
    PromoEffectType["DISCOUNT_AMOUNT"] = "discount_amount";
    PromoEffectType["SUBSCRIPTION_TRIAL"] = "subscription_trial";
})(PromoEffectType || (exports.PromoEffectType = PromoEffectType = {}));
let PromoCode = class PromoCode {
    id;
    code;
    discountType;
    discountValue;
    maxRedemptions;
    redeemedCount;
    minSpend;
    validFrom;
    validUntil;
    isActive;
    description;
    appliesTo;
    effectType;
    effectValue;
    trialDays;
    createdAt;
    updatedAt;
};
exports.PromoCode = PromoCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PromoCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 32, unique: true }),
    __metadata("design:type", String)
], PromoCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: PromoDiscountType,
        default: PromoDiscountType.PERCENT,
    }),
    __metadata("design:type", String)
], PromoCode.prototype, "discountType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, transformer: decimal_transformer_1.decimalTransformer }),
    __metadata("design:type", Number)
], PromoCode.prototype, "discountValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], PromoCode.prototype, "maxRedemptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PromoCode.prototype, "redeemedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimal_transformer_1.decimalTransformer }),
    __metadata("design:type", Object)
], PromoCode.prototype, "minSpend", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PromoCode.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PromoCode.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], PromoCode.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], PromoCode.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: PromoAppliesTo,
        default: PromoAppliesTo.ALL,
    }),
    __metadata("design:type", String)
], PromoCode.prototype, "appliesTo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: PromoEffectType,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PromoCode.prototype, "effectType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimal_transformer_1.decimalTransformer }),
    __metadata("design:type", Object)
], PromoCode.prototype, "effectValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], PromoCode.prototype, "trialDays", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PromoCode.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PromoCode.prototype, "updatedAt", void 0);
exports.PromoCode = PromoCode = __decorate([
    (0, typeorm_1.Entity)('promo_codes')
], PromoCode);
//# sourceMappingURL=promo-code.entity.js.map