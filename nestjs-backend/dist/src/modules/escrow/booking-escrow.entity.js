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
exports.BookingEscrow = exports.BookingEscrowStatus = void 0;
const typeorm_1 = require("typeorm");
const decimal_transformer_1 = require("../../common/transformers/decimal.transformer");
var BookingEscrowStatus;
(function (BookingEscrowStatus) {
    BookingEscrowStatus["HELD"] = "held";
    BookingEscrowStatus["RELEASED"] = "released";
    BookingEscrowStatus["REFUNDED"] = "refunded";
    BookingEscrowStatus["CANCELLED"] = "cancelled";
})(BookingEscrowStatus || (exports.BookingEscrowStatus = BookingEscrowStatus = {}));
let BookingEscrow = class BookingEscrow {
    id;
    bookingId;
    customerId;
    workerId;
    amount;
    status;
    heldAt;
    releasedAt;
    refundedAt;
    refundedAmount;
    createdAt;
};
exports.BookingEscrow = BookingEscrow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BookingEscrow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], BookingEscrow.prototype, "bookingId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], BookingEscrow.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], BookingEscrow.prototype, "workerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, transformer: decimal_transformer_1.decimalTransformer }),
    __metadata("design:type", Number)
], BookingEscrow.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: BookingEscrowStatus,
        default: BookingEscrowStatus.HELD,
    }),
    __metadata("design:type", String)
], BookingEscrow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BookingEscrow.prototype, "heldAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BookingEscrow.prototype, "releasedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], BookingEscrow.prototype, "refundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimal_transformer_1.decimalTransformer }),
    __metadata("design:type", Object)
], BookingEscrow.prototype, "refundedAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BookingEscrow.prototype, "createdAt", void 0);
exports.BookingEscrow = BookingEscrow = __decorate([
    (0, typeorm_1.Entity)('booking_escrows'),
    (0, typeorm_1.Index)('idx_booking_escrows_workerId_status', ['workerId', 'status']),
    (0, typeorm_1.Index)('idx_booking_escrows_status', ['status'])
], BookingEscrow);
//# sourceMappingURL=booking-escrow.entity.js.map