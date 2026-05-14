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
var BookingReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../bookings/booking.entity");
const notification_entity_1 = require("../notifications/notification.entity");
let BookingReminderService = BookingReminderService_1 = class BookingReminderService {
    bookingRepo;
    notifRepo;
    logger = new common_1.Logger(BookingReminderService_1.name);
    constructor(bookingRepo, notifRepo) {
        this.bookingRepo = bookingRepo;
        this.notifRepo = notifRepo;
    }
    parseScheduled(b) {
        const time = b.scheduledTime ?? '09:00';
        const dt = new Date(`${b.scheduledDate}T${time}:00`);
        return dt.getTime();
    }
    async sendReminders() {
        const now = Date.now();
        const horizonMs = 26 * 60 * 60 * 1000;
        const today = new Date(now);
        const dates = [];
        for (let i = 0; i <= 2; i++) {
            const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            dates.push(d.toISOString().slice(0, 10));
        }
        const candidates = await this.bookingRepo.find({
            where: {
                status: (0, typeorm_2.In)([booking_entity_1.BookingStatus.CONFIRMED, booking_entity_1.BookingStatus.IN_PROGRESS]),
                scheduledDate: (0, typeorm_2.In)(dates),
            },
            relations: ['customer', 'worker'],
        });
        let sent24 = 0;
        let sent1 = 0;
        const nowDate = new Date();
        for (const b of candidates) {
            const sched = this.parseScheduled(b);
            if (Number.isNaN(sched))
                continue;
            const deltaMs = sched - now;
            const in24h = deltaMs >= 23 * 3600 * 1000 && deltaMs <= 25 * 3600 * 1000;
            const in1h = deltaMs >= 45 * 60 * 1000 && deltaMs <= 75 * 60 * 1000;
            if (in24h && !b.reminder24hSentAt) {
                await this.dispatch(b, '24h');
                b.reminder24hSentAt = nowDate;
                await this.bookingRepo.save(b);
                sent24++;
            }
            else if (in1h && !b.reminder1hSentAt) {
                await this.dispatch(b, '1h');
                b.reminder1hSentAt = nowDate;
                await this.bookingRepo.save(b);
                sent1++;
            }
            void horizonMs;
            void typeorm_2.IsNull;
        }
        this.logger.log(`[BookingReminder] checked ${candidates.length} bookings, sent ${sent24} (24h) + ${sent1} (1h)`);
    }
    async dispatch(b, kind) {
        const customerName = b.customer?.fullName ?? 'Müşteri';
        const workerName = b.worker?.fullName ?? 'Usta';
        const time = b.scheduledTime ?? '';
        const when = kind === '24h' ? 'Yarın' : '1 saat sonra';
        const prefix = kind === '24h' ? '📅' : '⏰';
        const customerNotif = this.notifRepo.create({
            userId: b.customerId,
            type: notification_entity_1.NotificationType.BOOKING_CONFIRMED,
            title: `${prefix} Randevu Hatırlatması`,
            body: `${when} ${workerName} ile randevun var: ${b.category}${time ? `, ${time}` : ''}`,
            refId: b.id,
            relatedType: 'booking',
            relatedId: b.id,
        });
        const workerNotif = this.notifRepo.create({
            userId: b.workerId,
            type: notification_entity_1.NotificationType.BOOKING_CONFIRMED,
            title: `${prefix} Randevu Hatırlatması`,
            body: `${when} ${customerName} için iş: ${b.category}${time ? `, ${time}` : ''}`,
            refId: b.id,
            relatedType: 'booking',
            relatedId: b.id,
        });
        await this.notifRepo.save([customerNotif, workerNotif]);
    }
};
exports.BookingReminderService = BookingReminderService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingReminderService.prototype, "sendReminders", null);
exports.BookingReminderService = BookingReminderService = BookingReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BookingReminderService);
//# sourceMappingURL=booking-reminder.service.js.map