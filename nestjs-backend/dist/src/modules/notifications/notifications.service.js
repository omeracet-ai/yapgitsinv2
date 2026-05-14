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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./notification.entity");
const user_entity_1 = require("../users/user.entity");
const fcm_service_1 = require("./fcm.service");
const email_service_1 = require("../email/email.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    repo;
    usersRepo;
    fcm;
    email;
    constructor(repo, usersRepo, fcm, email) {
        this.repo = repo;
        this.usersRepo = usersRepo;
        this.fcm = fcm;
        this.email = email;
    }
    async sendEmailForNotification(userId, type, title, body) {
        const emailTypes = [
            notification_entity_1.NotificationType.BOOKING_CONFIRMED,
            notification_entity_1.NotificationType.OFFER_ACCEPTED,
            notification_entity_1.NotificationType.OFFER_REJECTED,
        ];
        if (!emailTypes.includes(type))
            return;
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'email', 'fullName', 'notificationPreferences'],
        });
        if (!user || !user.email)
            return;
        const cat = NotificationsService_1.categoryFor(type);
        if (user.notificationPreferences &&
            user.notificationPreferences[cat] === false) {
            return;
        }
        const html = `<!doctype html><body style="font-family:Arial,sans-serif;color:#2D3E50">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <div style="background:#007DFE;padding:20px 24px;color:#fff">
          <div style="font-size:22px;font-weight:bold">Yapgitsin</div>
          <div style="font-size:14px">${title}</div>
        </div>
        <div style="padding:24px">
          <p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
          <p>${body}</p>
          <p style="margin-top:24px"><a href="https://yapgitsin.tr" style="background:#007DFE;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Uygulamayı Aç</a></p>
        </div>
        <div style="padding:16px 24px;background:#F8F9FA;color:#6b7280;font-size:12px">
          destek@yapgitsin.tr · <a href="https://yapgitsin.tr/unsubscribe" style="color:#007DFE">Abonelikten çık</a>
        </div>
      </div></body>`;
        void this.email.send(user.email, `${title} — Yapgitsin`, html);
    }
    static categoryFor(type) {
        switch (type) {
            case notification_entity_1.NotificationType.BOOKING_REQUEST:
            case notification_entity_1.NotificationType.BOOKING_CONFIRMED:
            case notification_entity_1.NotificationType.BOOKING_CANCELLED:
            case notification_entity_1.NotificationType.BOOKING_COMPLETED:
                return 'booking';
            case notification_entity_1.NotificationType.NEW_OFFER:
            case notification_entity_1.NotificationType.OFFER_ACCEPTED:
            case notification_entity_1.NotificationType.OFFER_REJECTED:
            case notification_entity_1.NotificationType.COUNTER_OFFER:
            case notification_entity_1.NotificationType.OFFER_EXPIRED:
                return 'offer';
            case notification_entity_1.NotificationType.NEW_REVIEW:
            case notification_entity_1.NotificationType.REVIEW_REMINDER:
                return 'review';
            default:
                return 'system';
        }
    }
    async shouldSendNotification(userId, type) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'notificationPreferences'],
        });
        if (!user || !user.notificationPreferences)
            return true;
        const cat = NotificationsService_1.categoryFor(type);
        return user.notificationPreferences[cat] !== false;
    }
    static relatedTypeFor(type) {
        switch (type) {
            case notification_entity_1.NotificationType.BOOKING_REQUEST:
            case notification_entity_1.NotificationType.BOOKING_CONFIRMED:
            case notification_entity_1.NotificationType.BOOKING_CANCELLED:
            case notification_entity_1.NotificationType.BOOKING_COMPLETED:
                return 'booking';
            case notification_entity_1.NotificationType.NEW_OFFER:
            case notification_entity_1.NotificationType.OFFER_ACCEPTED:
            case notification_entity_1.NotificationType.OFFER_REJECTED:
            case notification_entity_1.NotificationType.COUNTER_OFFER:
            case notification_entity_1.NotificationType.OFFER_EXPIRED:
            case notification_entity_1.NotificationType.JOB_PENDING_COMPLETION:
            case notification_entity_1.NotificationType.JOB_COMPLETED:
            case notification_entity_1.NotificationType.JOB_CANCELLED:
            case notification_entity_1.NotificationType.DISPUTE_OPENED:
            case notification_entity_1.NotificationType.DISPUTE_RESOLVED:
            case notification_entity_1.NotificationType.SAVED_SEARCH_MATCH:
                return 'job';
            case notification_entity_1.NotificationType.NEW_REVIEW:
            case notification_entity_1.NotificationType.REVIEW_REMINDER:
                return 'user';
            default:
                return null;
        }
    }
    async send(data) {
        const allowed = await this.shouldSendNotification(data.userId, data.type);
        if (!allowed)
            return null;
        const relatedType = data.relatedType !== undefined
            ? data.relatedType
            : NotificationsService_1.relatedTypeFor(data.type);
        const relatedId = data.relatedId !== undefined ? data.relatedId : data.refId ?? null;
        const n = this.repo.create({
            userId: data.userId,
            type: data.type,
            title: data.title,
            body: data.body,
            refId: data.refId ?? null,
            relatedType,
            relatedId,
            isRead: false,
        });
        const saved = await this.repo.save(n);
        void this.sendEmailForNotification(data.userId, data.type, data.title, data.body);
        void this.fcm.sendToUser(data.userId, data.title, data.body, {
            type: String(data.type),
            ...(data.refId ? { refId: data.refId } : {}),
            ...(relatedType ? { relatedType } : {}),
            ...(relatedId ? { relatedId } : {}),
        });
        return saved;
    }
    getByUser(userId) {
        return this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async markRead(id, userId) {
        await this.repo.update({ id, userId }, { isRead: true });
    }
    async markAllRead(userId) {
        await this.repo.update({ userId, isRead: false }, { isRead: true });
    }
    async unreadCount(userId) {
        return this.repo.count({ where: { userId, isRead: false } });
    }
    async updateUserPushSettings(userId, settings) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            return;
        const updates = {};
        if (settings.fcmToken !== undefined) {
            if (settings.fcmToken) {
                const tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
                if (!tokens.includes(settings.fcmToken)) {
                    tokens.push(settings.fcmToken);
                }
                updates.fcmTokens = tokens;
            }
            else {
                updates.fcmTokens = null;
            }
        }
        if (settings.pushNotificationsEnabled !== undefined) {
            updates.pushNotificationsEnabled = settings.pushNotificationsEnabled;
        }
        if (Object.keys(updates).length > 0) {
            await this.usersRepo.update(userId, updates);
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        fcm_service_1.FcmService,
        email_service_1.EmailService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map