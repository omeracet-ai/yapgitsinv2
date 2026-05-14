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
var BookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("./booking.entity");
const user_entity_1 = require("../users/user.entity");
const users_service_1 = require("../users/users.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const availability_service_1 = require("../availability/availability.service");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
const admin_audit_log_entity_1 = require("../admin-audit/admin-audit-log.entity");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
const booking_escrow_service_1 = require("../escrow/booking-escrow.service");
const money_util_1 = require("../../common/money.util");
const booking_escrow_entity_1 = require("../escrow/booking-escrow.entity");
let BookingsService = BookingsService_1 = class BookingsService {
    repo;
    usersService;
    notificationsService;
    availabilityService;
    dataSource;
    auditService;
    escrowService;
    logger = new common_1.Logger(BookingsService_1.name);
    constructor(repo, usersService, notificationsService, availabilityService, dataSource, auditService, escrowService) {
        this.repo = repo;
        this.usersService = usersService;
        this.notificationsService = notificationsService;
        this.availabilityService = availabilityService;
        this.dataSource = dataSource;
        this.auditService = auditService;
        this.escrowService = escrowService;
    }
    _computeRefund(scheduledAt, agreedPrice) {
        if (!agreedPrice || agreedPrice <= 0)
            return { percent: 0, amount: 0 };
        if (!scheduledAt)
            return { percent: 100, amount: agreedPrice };
        const now = Date.now();
        const diffMs = scheduledAt.getTime() - now;
        const oneDay = 24 * 60 * 60 * 1000;
        let percent;
        if (diffMs >= oneDay)
            percent = 100;
        else if (diffMs >= 0)
            percent = 50;
        else
            percent = 0;
        const amount = Math.round(agreedPrice * percent) / 100;
        return { percent, amount };
    }
    async cancelBooking(bookingId, userId, reason) {
        if (!Object.values(booking_entity_1.CancellationReason).includes(reason)) {
            throw new common_1.BadRequestException('Geçersiz iptal sebebi');
        }
        const result = await this.dataSource.transaction(async (em) => {
            let booking;
            try {
                booking = await em.findOne(booking_entity_1.Booking, {
                    where: { id: bookingId },
                    relations: ['customer', 'worker'],
                    lock: { mode: 'pessimistic_write' },
                });
            }
            catch {
                booking = await em.findOne(booking_entity_1.Booking, {
                    where: { id: bookingId },
                    relations: ['customer', 'worker'],
                });
            }
            if (!booking)
                throw new common_1.NotFoundException('Randevu bulunamadı');
            if (booking.customerId !== userId && booking.workerId !== userId) {
                throw new common_1.ForbiddenException('Yetkisiz işlem');
            }
            if (booking.status === booking_entity_1.BookingStatus.CANCELLED ||
                booking.status === booking_entity_1.BookingStatus.COMPLETED) {
                throw new common_1.BadRequestException('Tamamlanmış veya iptal edilmiş randevular iptal edilemez');
            }
            const scheduledAt = this._parseScheduled(booking.scheduledDate, booking.scheduledTime);
            const { percent, amount } = this._computeRefund(scheduledAt, booking.agreedPrice);
            const refundStatus = amount > 0 ? booking_entity_1.RefundStatus.PENDING : booking_entity_1.RefundStatus.NONE;
            const old = booking.status;
            booking.status = booking_entity_1.BookingStatus.CANCELLED;
            booking.cancelledAt = new Date();
            booking.cancelledBy = userId;
            booking.cancellationReason = reason;
            booking.refundAmount = amount;
            booking.refundStatus = refundStatus;
            const saved = await em.save(booking);
            const heldEscrow = await em.findOne(booking_escrow_entity_1.BookingEscrow, {
                where: { bookingId: booking.id, status: booking_escrow_entity_1.BookingEscrowStatus.HELD },
            });
            if (heldEscrow) {
                const escrowRefund = Math.round(((heldEscrow.amount * percent) / 100) * 100) / 100;
                heldEscrow.status =
                    percent > 0
                        ? booking_escrow_entity_1.BookingEscrowStatus.REFUNDED
                        : booking_escrow_entity_1.BookingEscrowStatus.CANCELLED;
                heldEscrow.refundedAt = new Date();
                heldEscrow.refundedAmount = escrowRefund;
                await em.save(heldEscrow);
                if (escrowRefund > 0) {
                    await em.save(em.create(token_transaction_entity_1.TokenTransaction, {
                        userId: booking.customerId,
                        type: token_transaction_entity_1.TxType.REFUND,
                        amount: escrowRefund,
                        amountMinor: (0, money_util_1.tlToMinor)(escrowRefund) ?? 0,
                        description: `Escrow refund (${percent}%) — booking ${booking.id}`,
                        status: token_transaction_entity_1.TxStatus.COMPLETED,
                        paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                        paymentRef: `ESCROW-REFUND-${booking.id}`,
                    }));
                    await em.increment(user_entity_1.User, { id: booking.customerId }, 'tokenBalance', escrowRefund);
                }
                await em.save(em.create(admin_audit_log_entity_1.AdminAuditLog, {
                    adminUserId: userId,
                    action: 'escrow.refund',
                    targetType: 'booking_escrow',
                    targetId: heldEscrow.id,
                    payload: {
                        bookingId: booking.id,
                        customerId: booking.customerId,
                        amount: heldEscrow.amount,
                        refundAmount: escrowRefund,
                        percent,
                        via: 'cancelBooking',
                    },
                }));
            }
            else if (amount > 0) {
                const tx = em.create(token_transaction_entity_1.TokenTransaction, {
                    userId: booking.customerId,
                    type: token_transaction_entity_1.TxType.REFUND,
                    amount,
                    amountMinor: (0, money_util_1.tlToMinor)(amount) ?? 0,
                    description: `Booking ${booking.id} iptal — ${percent}% iade`,
                    status: token_transaction_entity_1.TxStatus.COMPLETED,
                    paymentMethod: token_transaction_entity_1.PaymentMethod.SYSTEM,
                });
                await em.save(tx);
                await em.increment(user_entity_1.User, { id: booking.customerId }, 'tokenBalance', amount);
            }
            const cancelledByCustomer = userId === booking.customerId;
            const actor = cancelledByCustomer
                ? booking.customer?.fullName
                : booking.worker?.fullName;
            const counterPartyId = cancelledByCustomer
                ? booking.workerId
                : booking.customerId;
            await em.save(em.create(notification_entity_1.Notification, {
                userId: counterPartyId,
                type: notification_entity_1.NotificationType.BOOKING_CANCELLED,
                title: '❌ Randevu İptal Edildi',
                body: `${actor ?? 'Taraf'} randevuyu iptal etti. İade: ${amount}₺ (%${percent})`,
                refId: booking.id,
            }));
            await em.save(em.create(notification_entity_1.Notification, {
                userId,
                type: notification_entity_1.NotificationType.BOOKING_CANCELLED,
                title: '❌ Randevu İptal Edildi',
                body: `İptal işlendi. İade tutarı: ${amount}₺ (%${percent})`,
                refId: booking.id,
            }));
            await em.save(em.create(admin_audit_log_entity_1.AdminAuditLog, {
                adminUserId: userId,
                action: 'booking.cancel',
                targetType: 'booking',
                targetId: booking.id,
                payload: {
                    reason,
                    refundAmount: amount,
                    refundPercent: percent,
                    refundStatus,
                    previousStatus: old,
                    agreedPrice: booking.agreedPrice,
                },
            }));
            return { saved, percent, amount, refundStatus, old };
        });
        if (result.old !== booking_entity_1.BookingStatus.PENDING) {
            await this.usersService.bumpStat(result.saved.customerId, 'asCustomerFail');
            await this.usersService.bumpStat(result.saved.workerId, 'asWorkerFail');
            await this.usersService.recalcReputation(result.saved.customerId);
            await this.usersService.recalcReputation(result.saved.workerId);
        }
        return {
            status: result.saved.status,
            refundAmount: result.amount,
            refundStatus: result.refundStatus,
            refundPercent: result.percent,
            booking: result.saved,
        };
    }
    _parseScheduled(dateStr, timeStr) {
        if (!dateStr)
            return null;
        const time = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '12:00';
        const iso = `${dateStr}T${time}:00`;
        const d = new Date(iso);
        return isNaN(d.getTime()) ? null : d;
    }
    async create(customerId, data) {
        const worker = await this.usersService.findById(data.workerId);
        if (!worker)
            throw new common_1.NotFoundException('Usta bulunamadı');
        const scheduledAt = this._parseScheduled(data.scheduledDate, data.scheduledTime);
        if (scheduledAt) {
            let ok = true;
            try {
                ok = await this.availabilityService.isAvailable(data.workerId, scheduledAt);
            }
            catch (err) {
                this.logger.warn(`Availability check failed for worker ${data.workerId}: ${err.message}. Proceeding without block.`);
                ok = true;
            }
            if (!ok) {
                throw new common_1.BadRequestException('Seçtiğin tarih/saat için usta müsait değil. Müsait saatleri profilinden kontrol et.');
            }
        }
        const booking = this.repo.create({
            customerId,
            workerId: data.workerId,
            category: data.category,
            subCategory: data.subCategory ?? null,
            description: data.description,
            address: data.address,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime ?? null,
            customerNote: data.customerNote ?? null,
            status: booking_entity_1.BookingStatus.PENDING,
        });
        const saved = await this.repo.save(booking);
        const customer = await this.usersService.findById(customerId);
        await this.notificationsService.send({
            userId: data.workerId,
            type: notification_entity_1.NotificationType.BOOKING_REQUEST,
            title: '📅 Yeni Randevu İsteği',
            body: `${customer?.fullName ?? 'Bir müşteri'} sizi ${data.category} için ${data.scheduledDate} tarihine randevu istedi.`,
            refId: saved.id,
        });
        return saved;
    }
    async updateStatus(id, actorId, status, note) {
        const booking = await this.repo.findOne({
            where: { id },
            relations: ['customer', 'worker'],
        });
        if (!booking)
            throw new common_1.NotFoundException('Randevu bulunamadı');
        const isWorker = booking.workerId === actorId;
        const isCustomer = booking.customerId === actorId;
        if (!isWorker && !isCustomer)
            throw new common_1.ForbiddenException('Yetkisiz işlem');
        const old = booking.status;
        booking.status = status;
        if (note) {
            if (isWorker)
                booking.workerNote = note;
            if (isCustomer)
                booking.customerNote = note;
        }
        const saved = await this.repo.save(booking);
        await this._notifyStatusChange(saved, old, isWorker);
        if (status === booking_entity_1.BookingStatus.COMPLETED) {
            await this.usersService.bumpStat(booking.customerId, 'asCustomerSuccess');
            await this.usersService.bumpStat(booking.workerId, 'asWorkerSuccess');
            await this.usersService.recalcReputation(booking.customerId);
            await this.usersService.recalcReputation(booking.workerId);
        }
        if (status === booking_entity_1.BookingStatus.CANCELLED) {
            if (old !== booking_entity_1.BookingStatus.PENDING) {
                await this.usersService.bumpStat(booking.customerId, 'asCustomerFail');
                await this.usersService.bumpStat(booking.workerId, 'asWorkerFail');
                await this.usersService.recalcReputation(booking.customerId);
                await this.usersService.recalcReputation(booking.workerId);
            }
        }
        return saved;
    }
    async findByCustomer(customerId, page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            where: { customerId },
            relations: ['worker'],
            order: { scheduledDate: 'DESC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findByWorker(workerId, page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            where: { workerId },
            relations: ['customer'],
            order: { scheduledDate: 'ASC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async findOne(id, actorId) {
        const b = await this.repo.findOne({
            where: { id },
            relations: ['customer', 'worker'],
        });
        if (!b)
            throw new common_1.NotFoundException('Randevu bulunamadı');
        if (b.customerId !== actorId && b.workerId !== actorId)
            throw new common_1.ForbiddenException('Yetkisiz işlem');
        return b;
    }
    async _notifyStatusChange(b, _old, isWorker) {
        if (b.status === booking_entity_1.BookingStatus.CONFIRMED) {
            await this.notificationsService.send({
                userId: b.customerId,
                type: notification_entity_1.NotificationType.BOOKING_CONFIRMED,
                title: '✅ Randevunuz Onaylandı',
                body: `${b.worker?.fullName ?? 'Usta'} randevunuzu onayladı. Tarih: ${b.scheduledDate}`,
                refId: b.id,
            });
        }
        if (b.status === booking_entity_1.BookingStatus.CANCELLED) {
            const notifyId = isWorker ? b.customerId : b.workerId;
            const actor = isWorker ? b.worker?.fullName : b.customer?.fullName;
            await this.notificationsService.send({
                userId: notifyId,
                type: notification_entity_1.NotificationType.BOOKING_CANCELLED,
                title: '❌ Randevu İptal Edildi',
                body: `${actor ?? 'Taraf'} randevuyu iptal etti.`,
                refId: b.id,
            });
        }
        if (b.status === booking_entity_1.BookingStatus.COMPLETED) {
            await this.notificationsService.send({
                userId: b.customerId,
                type: notification_entity_1.NotificationType.BOOKING_COMPLETED,
                title: '🎉 İş Tamamlandı',
                body: `${b.worker?.fullName ?? 'Usta'} işi tamamlandı olarak işaretledi. Değerlendirme yapmayı unutmayın!`,
                refId: b.id,
            });
        }
    }
    async exportIcs(workerId) {
        const bookings = await this.repo.find({
            where: [
                { workerId, status: booking_entity_1.BookingStatus.CONFIRMED },
                { workerId, status: booking_entity_1.BookingStatus.PENDING },
            ],
            relations: ['customer'],
            order: { scheduledDate: 'ASC' },
        });
        const stamp = this._toIcsDate(new Date());
        const events = bookings.map((b) => {
            const start = this._bookingStartDate(b.scheduledDate, b.scheduledTime);
            const dtStart = this._toIcsDate(start);
            const customerName = b.customer?.fullName ?? 'Müşteri';
            const summary = `İş: ${b.category}${b.subCategory ? ' / ' + b.subCategory : ''}`;
            const desc = `Müşteri: ${customerName}\\nAdres: ${b.address}`;
            return [
                'BEGIN:VEVENT',
                `UID:${b.id}@yapgitsin.tr`,
                `DTSTAMP:${stamp}`,
                `DTSTART:${dtStart}`,
                'DURATION:PT2H',
                `SUMMARY:${summary}`,
                `DESCRIPTION:${desc}`,
                'END:VEVENT',
            ].join('\r\n');
        });
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Yapgitsin//TR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            ...events,
            'END:VCALENDAR',
        ].join('\r\n');
    }
    _toIcsDate(d) {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    _bookingStartDate(scheduledDate, scheduledTime) {
        const [year, month, day] = scheduledDate.split('-').map(Number);
        if (scheduledTime) {
            const [hour, minute] = scheduledTime.split(':').map(Number);
            return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
        }
        return new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = BookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        notifications_service_1.NotificationsService,
        availability_service_1.AvailabilityService,
        typeorm_2.DataSource,
        admin_audit_service_1.AdminAuditService,
        booking_escrow_service_1.BookingEscrowService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map