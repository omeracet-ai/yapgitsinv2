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
exports.Booking = exports.RefundStatus = exports.CancellationReason = exports.BookingStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["IN_PROGRESS"] = "in_progress";
    BookingStatus["COMPLETED"] = "completed";
    BookingStatus["CANCELLED"] = "cancelled";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var CancellationReason;
(function (CancellationReason) {
    CancellationReason["CUSTOMER_CHANGE"] = "customer_change";
    CancellationReason["WORKER_UNAVAILABLE"] = "worker_unavailable";
    CancellationReason["WEATHER"] = "weather";
    CancellationReason["EMERGENCY"] = "emergency";
    CancellationReason["OTHER"] = "other";
})(CancellationReason || (exports.CancellationReason = CancellationReason = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "pending";
    RefundStatus["PROCESSED"] = "processed";
    RefundStatus["NONE"] = "none";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
let Booking = class Booking {
    id;
    tenantId;
    customerId;
    customer;
    workerId;
    worker;
    category;
    subCategory;
    description;
    address;
    scheduledDate;
    scheduledTime;
    status;
    agreedPrice;
    agreedPriceMinor;
    workerNote;
    customerNote;
    cancelledAt;
    cancelledBy;
    cancellationReason;
    refundAmount;
    refundStatus;
    reminder24hSentAt;
    reminder1hSentAt;
    createdAt;
    updatedAt;
};
exports.Booking = Booking;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Booking.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Booking.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", user_entity_1.User)
], Booking.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Booking.prototype, "workerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE', eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'workerId' }),
    __metadata("design:type", user_entity_1.User)
], Booking.prototype, "worker", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Booking.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "subCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Booking.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Booking.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Booking.prototype, "scheduledDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "scheduledTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: BookingStatus,
        default: BookingStatus.PENDING,
    }),
    __metadata("design:type", String)
], Booking.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "agreedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "agreedPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "workerNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "customerNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "cancelledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: CancellationReason, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-enum', enum: RefundStatus, nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "refundStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "reminder24hSentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Booking.prototype, "reminder1hSentAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Booking.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Booking.prototype, "updatedAt", void 0);
exports.Booking = Booking = __decorate([
    (0, typeorm_1.Entity)('bookings'),
    (0, typeorm_1.Index)('idx_bookings_workerId_status_createdAt', ['workerId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_bookings_customerId_status_createdAt', ['customerId', 'status', 'createdAt'])
], Booking);
//# sourceMappingURL=booking.entity.js.map