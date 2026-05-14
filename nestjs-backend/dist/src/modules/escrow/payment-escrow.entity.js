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
exports.PaymentEscrow = exports.EscrowStatus = void 0;
const typeorm_1 = require("typeorm");
var EscrowStatus;
(function (EscrowStatus) {
    EscrowStatus["HELD"] = "HELD";
    EscrowStatus["RELEASED"] = "RELEASED";
    EscrowStatus["REFUNDED"] = "REFUNDED";
    EscrowStatus["DISPUTED"] = "DISPUTED";
    EscrowStatus["PARTIAL_REFUND"] = "PARTIAL_REFUND";
})(EscrowStatus || (exports.EscrowStatus = EscrowStatus = {}));
let PaymentEscrow = class PaymentEscrow {
    id;
    jobId;
    offerId;
    customerId;
    taskerId;
    amount;
    platformFeePct;
    platformFeeAmount;
    taskerNetAmount;
    amountMinor;
    platformFeeMinor;
    workerPayoutMinor;
    currency;
    status;
    paymentRef;
    paymentProvider;
    paymentToken;
    paymentTxnId;
    paymentStatus;
    refundNeedsAttention;
    refundAmount;
    releaseReason;
    refundReason;
    disputeReason;
    heldAt;
    releasedAt;
    refundedAt;
    disputedAt;
    createdAt;
    updatedAt;
};
exports.PaymentEscrow = PaymentEscrow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "offerId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "taskerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], PaymentEscrow.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 10 }),
    __metadata("design:type", Number)
], PaymentEscrow.prototype, "platformFeePct", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "platformFeeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "taskerNetAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PaymentEscrow.prototype, "amountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PaymentEscrow.prototype, "platformFeeMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PaymentEscrow.prototype, "workerPayoutMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'TRY' }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: EscrowStatus,
        default: EscrowStatus.HELD,
    }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "paymentRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 32, default: 'iyzipay' }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "paymentProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "paymentToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "paymentTxnId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16, default: 'pending' }),
    __metadata("design:type", String)
], PaymentEscrow.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PaymentEscrow.prototype, "refundNeedsAttention", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "releaseReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "refundReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "disputeReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentEscrow.prototype, "heldAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "releasedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "refundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PaymentEscrow.prototype, "disputedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PaymentEscrow.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PaymentEscrow.prototype, "updatedAt", void 0);
exports.PaymentEscrow = PaymentEscrow = __decorate([
    (0, typeorm_1.Entity)('payment_escrows'),
    (0, typeorm_1.Index)('idx_payment_escrows_status', ['status']),
    (0, typeorm_1.Index)('idx_payment_escrows_taskerId_status', ['taskerId', 'status']),
    (0, typeorm_1.Index)('idx_payment_escrows_paymentStatus', ['paymentStatus'])
], PaymentEscrow);
//# sourceMappingURL=payment-escrow.entity.js.map