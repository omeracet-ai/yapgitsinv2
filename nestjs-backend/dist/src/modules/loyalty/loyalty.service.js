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
exports.LoyaltyService = exports.REFERRAL_BONUS_TOKENS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
const TIER_THRESHOLDS = [
    { tier: 'Bronze', min: 0 },
    { tier: 'Silver', min: 5 },
    { tier: 'Gold', min: 15 },
    { tier: 'Platinum', min: 30 },
];
exports.REFERRAL_BONUS_TOKENS = 50;
let LoyaltyService = class LoyaltyService {
    userRepo;
    dataSource;
    notificationsService;
    auditService;
    constructor(userRepo, dataSource, notificationsService, auditService) {
        this.userRepo = userRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    generateCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 8; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }
    computeLoyaltyTier(user) {
        const totalSuccess = (user.asCustomerSuccess || 0) + (user.asWorkerSuccess || 0);
        let current = 'Bronze';
        let nextTier = null;
        let jobsToNextTier = null;
        for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
            const t = TIER_THRESHOLDS[i];
            if (totalSuccess >= t.min)
                current = t.tier;
        }
        const nextIdx = TIER_THRESHOLDS.findIndex((t) => totalSuccess < t.min);
        if (nextIdx > 0) {
            nextTier = TIER_THRESHOLDS[nextIdx].tier;
            jobsToNextTier = TIER_THRESHOLDS[nextIdx].min - totalSuccess;
        }
        return { tier: current, totalSuccess, nextTier, jobsToNextTier };
    }
    async getReferralCode(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (user.referralCode)
            return user.referralCode;
        for (let attempt = 0; attempt < 8; attempt++) {
            const code = this.generateCode();
            const exists = await this.userRepo.findOne({ where: { referralCode: code } });
            if (!exists) {
                user.referralCode = code;
                await this.userRepo.save(user);
                return code;
            }
        }
        throw new common_1.BadRequestException('Referans kodu üretilemedi');
    }
    async getMyLoyalty(userId) {
        const code = await this.getReferralCode(userId);
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const tierInfo = this.computeLoyaltyTier(user);
        return {
            referralCode: code,
            tier: tierInfo.tier,
            totalSuccess: tierInfo.totalSuccess,
            nextTier: tierInfo.nextTier,
            jobsToNextTier: tierInfo.jobsToNextTier,
        };
    }
    async redeemReferralCode(userId, code) {
        if (!code || typeof code !== 'string')
            throw new common_1.BadRequestException('Geçersiz kod');
        const normalized = code.trim().toUpperCase();
        if (normalized.length < 4)
            throw new common_1.BadRequestException('Geçersiz kod');
        const me = await this.userRepo.findOne({ where: { id: userId } });
        if (!me)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (me.referredByUserId)
            throw new common_1.BadRequestException('Zaten bir referans kodu kullandınız');
        if (me.referralCode === normalized)
            throw new common_1.BadRequestException('Kendi kodunuzu kullanamazsınız');
        const referrer = await this.userRepo.findOne({ where: { referralCode: normalized } });
        if (!referrer)
            throw new common_1.NotFoundException('Referans kodu bulunamadı');
        if (referrer.id === me.id)
            throw new common_1.BadRequestException('Kendi kodunuzu kullanamazsınız');
        await this.dataSource.transaction(async (manager) => {
            me.referredByUserId = referrer.id;
            me.tokenBalance = (me.tokenBalance || 0) + exports.REFERRAL_BONUS_TOKENS;
            referrer.tokenBalance = (referrer.tokenBalance || 0) + exports.REFERRAL_BONUS_TOKENS;
            await manager.save(user_entity_1.User, me);
            await manager.save(user_entity_1.User, referrer);
        });
        try {
            await this.notificationsService.send({
                userId: referrer.id,
                type: notification_entity_1.NotificationType.SYSTEM,
                title: '🎁 Referansınız kullanıldı',
                body: `${me.fullName} davet kodunuzu kullandı. +${exports.REFERRAL_BONUS_TOKENS} token kazandınız!`,
            });
            await this.notificationsService.send({
                userId: me.id,
                type: notification_entity_1.NotificationType.SYSTEM,
                title: '🎁 Hoş geldin bonusu',
                body: `Davet kodu kullanıldı. +${exports.REFERRAL_BONUS_TOKENS} token hesabınıza eklendi.`,
            });
        }
        catch {
        }
        try {
            await this.auditService.logAction(userId, 'loyalty.referral_redeem', 'user', referrer.id, {
                code: normalized,
                bonusTokens: exports.REFERRAL_BONUS_TOKENS,
            });
        }
        catch {
        }
        return { success: true, bonusTokens: exports.REFERRAL_BONUS_TOKENS };
    }
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        admin_audit_service_1.AdminAuditService])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map