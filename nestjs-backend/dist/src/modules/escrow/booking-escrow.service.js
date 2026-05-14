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
exports.BookingEscrowService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_escrow_entity_1 = require("./booking-escrow.entity");
const user_entity_1 = require("../users/user.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const admin_audit_log_entity_1 = require("../admin-audit/admin-audit-log.entity");
let BookingEscrowService = class BookingEscrowService {
    repo;
    dataSource;
    constructor(repo, dataSource) {
        this.repo = repo;
        this.dataSource = dataSource;
    }
    async hold(bookingId, customerId, workerId, amount) {
        if (!bookingId || !customerId || !workerId) {
            throw new common_1.BadRequestException('Eksik parametre');
        }
        if (!(amount > 0)) {
            throw new common_1.BadRequestException('Miktar pozitif olmalı');
        }
        return this.dataSource.transaction(async (em) => {
            const existing = await em.findOne(booking_escrow_entity_1.BookingEscrow, {
                where: { bookingId, status: booking_escrow_entity_1.BookingEscrowStatus.HELD },
            });
            if (existing) {
                throw new common_1.BadRequestException('Bu booking için aktif escrow var');
            }
            let customer;
            try {
                customer = await em.findOne(user_entity_1.User, {
                    where: { id: customerId },
                    lock: { mode: 'pessimistic_write' },
                });
            }
            catch {
                customer = await em.findOne(user_entity_1.User, { where: { id: customerId } });
            }
            if (!customer)
                throw new common_1.NotFoundException('Müşteri bulunamadı');
            if ((customer.tokenBalance ?? 0) < amount) {
                throw new common_1.BadRequestException('Yetersiz bakiye');
            }
            await em.decrement(user_entity_1.User, { id: customerId }, 'tokenBalance', amount);
            const escrow = em.create(booking_escrow_entity_1.BookingEscrow, {
                bookingId,
                customerId,
                workerId,
                amount,
                status: booking_escrow_entity_1.BookingEscrowStatus.HELD,
            });
            const saved = await em.save(escrow);
            await em.save(em.create(token_transaction_entity_1.TokenTransaction, {
                userId: customerId,
                type: token_transaction_entity_1.TxType.SPEND,
                amount,
                description: `Escrow hold — booking ${bookingId}`,
                status: token_transaction_entity_1.TxStatus.COMPLETED,
                paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                paymentRef: `ESCROW-HOLD-${bookingId}`,
            }));
            await em.save(em.create(admin_audit_log_entity_1.AdminAuditLog, {
                adminUserId: customerId,
                action: 'escrow.hold',
                targetType: 'booking_escrow',
                targetId: saved.id,
                payload: { bookingId, customerId, workerId, amount },
            }));
            return saved;
        });
    }
    async release(bookingId, actorId) {
        return this.dataSource.transaction(async (em) => {
            let escrow;
            try {
                escrow = await em.findOne(booking_escrow_entity_1.BookingEscrow, {
                    where: { bookingId },
                    lock: { mode: 'pessimistic_write' },
                });
            }
            catch {
                escrow = await em.findOne(booking_escrow_entity_1.BookingEscrow, { where: { bookingId } });
            }
            if (!escrow)
                throw new common_1.NotFoundException('Escrow bulunamadı');
            if (escrow.customerId !== actorId) {
                throw new common_1.ForbiddenException('Sadece müşteri release edebilir');
            }
            if (escrow.status !== booking_escrow_entity_1.BookingEscrowStatus.HELD) {
                throw new common_1.BadRequestException(`Escrow ${escrow.status} durumunda, release edilemez`);
            }
            escrow.status = booking_escrow_entity_1.BookingEscrowStatus.RELEASED;
            escrow.releasedAt = new Date();
            const saved = await em.save(escrow);
            await em.increment(user_entity_1.User, { id: escrow.workerId }, 'tokenBalance', escrow.amount);
            await em.save(em.create(token_transaction_entity_1.TokenTransaction, {
                userId: escrow.workerId,
                type: token_transaction_entity_1.TxType.PURCHASE,
                amount: escrow.amount,
                description: `Escrow release — booking ${bookingId}`,
                status: token_transaction_entity_1.TxStatus.COMPLETED,
                paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                paymentRef: `ESCROW-RELEASE-${bookingId}`,
            }));
            await em.save(em.create(admin_audit_log_entity_1.AdminAuditLog, {
                adminUserId: actorId,
                action: 'escrow.release',
                targetType: 'booking_escrow',
                targetId: saved.id,
                payload: {
                    bookingId,
                    workerId: escrow.workerId,
                    amount: escrow.amount,
                },
            }));
            return saved;
        });
    }
    async refund(bookingId, percent, actorId) {
        if (percent < 0 || percent > 100) {
            throw new common_1.BadRequestException('Geçersiz yüzde');
        }
        return this.dataSource.transaction(async (em) => {
            let escrow;
            try {
                escrow = await em.findOne(booking_escrow_entity_1.BookingEscrow, {
                    where: { bookingId },
                    lock: { mode: 'pessimistic_write' },
                });
            }
            catch {
                escrow = await em.findOne(booking_escrow_entity_1.BookingEscrow, { where: { bookingId } });
            }
            if (!escrow)
                return null;
            if (escrow.status !== booking_escrow_entity_1.BookingEscrowStatus.HELD) {
                return escrow;
            }
            const refundAmount = Math.round(((escrow.amount * percent) / 100) * 100) / 100;
            escrow.status =
                percent > 0
                    ? booking_escrow_entity_1.BookingEscrowStatus.REFUNDED
                    : booking_escrow_entity_1.BookingEscrowStatus.CANCELLED;
            escrow.refundedAt = new Date();
            escrow.refundedAmount = refundAmount;
            const saved = await em.save(escrow);
            if (refundAmount > 0) {
                await em.increment(user_entity_1.User, { id: escrow.customerId }, 'tokenBalance', refundAmount);
                await em.save(em.create(token_transaction_entity_1.TokenTransaction, {
                    userId: escrow.customerId,
                    type: token_transaction_entity_1.TxType.REFUND,
                    amount: refundAmount,
                    description: `Escrow refund (${percent}%) — booking ${bookingId}`,
                    status: token_transaction_entity_1.TxStatus.COMPLETED,
                    paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                    paymentRef: `ESCROW-REFUND-${bookingId}`,
                }));
            }
            await em.save(em.create(admin_audit_log_entity_1.AdminAuditLog, {
                adminUserId: actorId ?? escrow.customerId,
                action: 'escrow.refund',
                targetType: 'booking_escrow',
                targetId: saved.id,
                payload: {
                    bookingId,
                    customerId: escrow.customerId,
                    amount: escrow.amount,
                    refundAmount,
                    percent,
                },
            }));
            return saved;
        });
    }
    async getByBooking(bookingId, requesterId) {
        const escrow = await this.repo.findOne({ where: { bookingId } });
        if (!escrow)
            return null;
        if (escrow.customerId !== requesterId &&
            escrow.workerId !== requesterId) {
            throw new common_1.ForbiddenException('Bu escrow size ait değil');
        }
        return escrow;
    }
};
exports.BookingEscrowService = BookingEscrowService;
exports.BookingEscrowService = BookingEscrowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_escrow_entity_1.BookingEscrow)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], BookingEscrowService);
//# sourceMappingURL=booking-escrow.service.js.map