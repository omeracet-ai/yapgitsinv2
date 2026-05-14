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
exports.DataPrivacyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const data_deletion_request_entity_1 = require("./data-deletion-request.entity");
const job_entity_1 = require("../jobs/job.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const review_entity_1 = require("../reviews/review.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const chat_message_entity_1 = require("../chat/chat-message.entity");
const token_transaction_entity_1 = require("../tokens/token-transaction.entity");
let DataPrivacyService = class DataPrivacyService {
    users;
    deletionRequests;
    jobs;
    offers;
    reviews;
    bookings;
    notifications;
    chatMessages;
    tokenTransactions;
    constructor(users, deletionRequests, jobs, offers, reviews, bookings, notifications, chatMessages, tokenTransactions) {
        this.users = users;
        this.deletionRequests = deletionRequests;
        this.jobs = jobs;
        this.offers = offers;
        this.reviews = reviews;
        this.bookings = bookings;
        this.notifications = notifications;
        this.chatMessages = chatMessages;
        this.tokenTransactions = tokenTransactions;
    }
    async exportUserData(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const { passwordHash: _ph, ...profile } = user;
        const [jobs, offers, reviewsWritten, reviewsReceived, bookingsAsCustomer, bookingsAsWorker, notifications, chatHistory, tokenTransactions,] = await Promise.all([
            this.jobs.find({ where: { customerId: userId } }),
            this.offers.find({ where: { userId } }),
            this.reviews.find({ where: { reviewerId: userId } }),
            this.reviews.find({ where: { revieweeId: userId } }),
            this.bookings.find({ where: { customerId: userId } }),
            this.bookings.find({ where: { workerId: userId } }),
            this.notifications.find({ where: { userId } }),
            this.chatMessages.find({ where: { from: userId } }),
            this.tokenTransactions.find({ where: { userId } }),
        ]);
        return {
            meta: {
                exportedAt: new Date().toISOString(),
                kvkkArticle: 'Madde 11',
                userId,
            },
            profile,
            jobs,
            offers,
            reviews: { written: reviewsWritten, received: reviewsReceived },
            bookings: { asCustomer: bookingsAsCustomer, asWorker: bookingsAsWorker },
            notifications,
            chatHistory,
            tokenTransactions,
            portfolioPhotos: Array.isArray(user.portfolioPhotos)
                ? user.portfolioPhotos
                : [],
        };
    }
    async createDeletionRequest(userId, reason) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const existing = await this.deletionRequests.findOne({
            where: { userId, status: data_deletion_request_entity_1.DataDeletionRequestStatus.PENDING },
        });
        if (existing) {
            throw new common_1.BadRequestException('Bekleyen bir silme talebiniz zaten var');
        }
        const now = new Date();
        const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const req = this.deletionRequests.create({
            userId,
            reason: reason ?? null,
            status: data_deletion_request_entity_1.DataDeletionRequestStatus.PENDING,
            scheduledDeletionAt: scheduled,
        });
        return this.deletionRequests.save(req);
    }
    async listDeletionRequests(status) {
        return this.deletionRequests.find({
            where: status ? { status } : {},
            order: { createdAt: 'DESC' },
        });
    }
    async moderateDeletionRequest(id, action, adminId, adminNote) {
        const req = await this.deletionRequests.findOne({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('Silme talebi bulunamadı');
        if (req.status !== data_deletion_request_entity_1.DataDeletionRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Sadece bekleyen talepler işlenebilir');
        }
        req.status =
            action === 'approve'
                ? data_deletion_request_entity_1.DataDeletionRequestStatus.APPROVED
                : data_deletion_request_entity_1.DataDeletionRequestStatus.REJECTED;
        req.processedAt = new Date();
        req.processedBy = adminId;
        req.adminNote = adminNote ?? null;
        return this.deletionRequests.save(req);
    }
    async executeDeletion(id, adminId) {
        const req = await this.deletionRequests.findOne({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('Silme talebi bulunamadı');
        if (req.status !== data_deletion_request_entity_1.DataDeletionRequestStatus.APPROVED) {
            throw new common_1.BadRequestException('Sadece onaylanmış talepler silinebilir');
        }
        const user = await this.users.findOne({ where: { id: req.userId } });
        if (user) {
            await this.users.remove(user);
        }
        req.status = data_deletion_request_entity_1.DataDeletionRequestStatus.COMPLETED;
        req.processedAt = new Date();
        req.processedBy = adminId;
        await this.deletionRequests.save(req);
        return { deleted: true, userId: req.userId };
    }
};
exports.DataPrivacyService = DataPrivacyService;
exports.DataPrivacyService = DataPrivacyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(data_deletion_request_entity_1.DataDeletionRequest)),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(3, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(4, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(5, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(6, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(7, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(8, (0, typeorm_1.InjectRepository)(token_transaction_entity_1.TokenTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DataPrivacyService);
//# sourceMappingURL=data-privacy.service.js.map