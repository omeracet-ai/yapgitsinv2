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
exports.DataExportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const payment_entity_1 = require("../payments/payment.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const review_entity_1 = require("../reviews/review.entity");
const chat_message_entity_1 = require("../chat/chat-message.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const job_lead_entity_1 = require("../leads/job-lead.entity");
const job_lead_response_entity_1 = require("../leads/job-lead-response.entity");
const SENSITIVE_USER_KEYS = new Set([
    'passwordHash',
    'twoFactorSecret',
    'calendarToken',
]);
const CHAT_LIMIT = 1000;
const NOTIFICATION_LIMIT = 500;
let DataExportService = class DataExportService {
    users;
    bookings;
    payments;
    escrows;
    reviews;
    chats;
    notifications;
    jobLeads;
    leadResponses;
    constructor(users, bookings, payments, escrows, reviews, chats, notifications, jobLeads, leadResponses) {
        this.users = users;
        this.bookings = bookings;
        this.payments = payments;
        this.escrows = escrows;
        this.reviews = reviews;
        this.chats = chats;
        this.notifications = notifications;
        this.jobLeads = jobLeads;
        this.leadResponses = leadResponses;
    }
    sanitizeUser(user) {
        if (!user)
            return null;
        const out = {};
        for (const [k, v] of Object.entries(user)) {
            if (SENSITIVE_USER_KEYS.has(k))
                continue;
            if (k === 'fcmTokens')
                continue;
            out[k] = v;
        }
        return out;
    }
    async exportForUser(userId) {
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const user = await this.users.findOne({ where: { id: userId } });
        const profile = this.sanitizeUser(user);
        const bookingsRaw = await this.bookings
            .createQueryBuilder('b')
            .where('(b.customerId = :uid OR b.workerId = :uid)', { uid: userId })
            .andWhere('b.createdAt >= :since', { since: fiveYearsAgo })
            .orderBy('b.createdAt', 'DESC')
            .getMany();
        const bookingIds = bookingsRaw.map((b) => b.id);
        const escrows = await this.escrows.find({
            where: [{ customerId: userId }, { taskerId: userId }],
            order: { createdAt: 'DESC' },
        });
        const payments = await this.payments.find({
            where: [{ customerId: userId }, { workerId: userId }],
            order: { createdAt: 'DESC' },
        });
        const jobLeads = await this.jobLeads.find({
            where: { customerId: userId },
            order: { createdAt: 'DESC' },
        });
        const jobLeadResponses = await this.leadResponses.find({
            where: { workerId: userId },
            order: { createdAt: 'DESC' },
        });
        const reviewsAuthored = await this.reviews.find({
            where: { reviewerId: userId },
            order: { createdAt: 'DESC' },
        });
        const reviewsReceived = await this.reviews.find({
            where: { revieweeId: userId },
            order: { createdAt: 'DESC' },
        });
        const chatRows = await this.chats.find({
            where: [{ from: userId }, { to: userId }],
            order: { createdAt: 'DESC' },
            take: CHAT_LIMIT + 1,
        });
        const chatTruncated = chatRows.length > CHAT_LIMIT;
        const chatMessages = chatRows.slice(0, CHAT_LIMIT).map((m) => ({
            id: m.id,
            jobId: m.jobId,
            jobLeadId: m.jobLeadId,
            message: m.message,
            createdAt: m.createdAt,
            direction: m.from === userId ? 'sent' : 'received',
            counterparty: m.from === userId ? 'Other user' : 'Other user',
            isOwnMessage: m.from === userId,
        }));
        const notifRows = await this.notifications.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: NOTIFICATION_LIMIT + 1,
        });
        const notifTruncated = notifRows.length > NOTIFICATION_LIMIT;
        const notifications = notifRows.slice(0, NOTIFICATION_LIMIT);
        const fcmTokens = Array.isArray(user?.fcmTokens) && user.fcmTokens.length
            ? user.fcmTokens.map(() => '[REDACTED]')
            : [];
        const fields = {
            profile,
            bookings: bookingsRaw,
            escrows,
            payments,
            jobLeads,
            jobLeadResponses,
            reviews: {
                authored: reviewsAuthored,
                received: reviewsReceived,
            },
            fcmTokens,
            chatMessages,
            notifications,
        };
        return {
            exportedAt: new Date().toISOString(),
            userId,
            fields,
            meta: {
                counts: {
                    bookings: bookingsRaw.length,
                    escrows: escrows.length,
                    payments: payments.length,
                    jobLeads: jobLeads.length,
                    jobLeadResponses: jobLeadResponses.length,
                    reviewsAuthored: reviewsAuthored.length,
                    reviewsReceived: reviewsReceived.length,
                    fcmTokens: fcmTokens.length,
                    chatMessages: chatMessages.length,
                    notifications: notifications.length,
                    bookingIdsTracked: bookingIds.length,
                },
                truncated: {
                    chatMessages: chatTruncated,
                    notifications: notifTruncated,
                },
                limits: {
                    chatMessages: CHAT_LIMIT,
                    notifications: NOTIFICATION_LIMIT,
                    bookingsSinceYears: 5,
                },
                redactionNotice: 'Authentication credentials, 2FA secrets, calendar tokens, and FCM device tokens are stripped. Chat counterparties are masked to "Other user".',
            },
        };
    }
};
exports.DataExportService = DataExportService;
exports.DataExportService = DataExportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_escrow_entity_1.PaymentEscrow)),
    __param(4, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(5, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(6, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(7, (0, typeorm_1.InjectRepository)(job_lead_entity_1.JobLead)),
    __param(8, (0, typeorm_1.InjectRepository)(job_lead_response_entity_1.JobLeadResponse)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DataExportService);
//# sourceMappingURL=data-export.service.js.map