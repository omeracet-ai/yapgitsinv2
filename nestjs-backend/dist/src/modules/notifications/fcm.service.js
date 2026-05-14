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
var FcmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
let FcmService = FcmService_1 = class FcmService {
    usersRepo;
    logger = new common_1.Logger(FcmService_1.name);
    admin = null;
    enabled = false;
    constructor(usersRepo) {
        this.usersRepo = usersRepo;
    }
    async onModuleInit() {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (!raw) {
            this.logger.log('FCM disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)');
            return;
        }
        try {
            let jsonStr = raw.trim();
            if (!jsonStr.startsWith('{')) {
                jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
            }
            const credentials = JSON.parse(jsonStr);
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(credentials),
                    projectId: process.env.FIREBASE_PROJECT_ID,
                });
            }
            this.admin = admin;
            this.enabled = true;
            this.logger.log('FCM initialized');
        }
        catch (err) {
            this.logger.warn(`FCM init failed — push disabled: ${err.message}`);
        }
    }
    isEnabled() {
        return this.enabled;
    }
    async sendToToken(token, title, body, data) {
        if (!this.enabled || !this.admin || !token)
            return false;
        try {
            await this.admin.messaging().send({
                token,
                notification: { title, body },
                data: data ?? {},
            });
            return true;
        }
        catch (err) {
            const code = err.code ?? '';
            if (code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered') {
                await this.cleanupTokens([token]);
            }
            else {
                this.logger.warn(`FCM sendToToken failed: ${err.message}`);
            }
            return false;
        }
    }
    async sendToTokens(tokens, title, body, data) {
        if (!this.enabled || !this.admin || !tokens || tokens.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }
        const unique = Array.from(new Set(tokens.filter((t) => typeof t === 'string' && t.length > 0)));
        if (unique.length === 0)
            return { successCount: 0, failureCount: 0 };
        const chunkSize = 500;
        let successCount = 0;
        let failureCount = 0;
        const invalid = [];
        for (let i = 0; i < unique.length; i += chunkSize) {
            const chunk = unique.slice(i, i + chunkSize);
            try {
                const response = await this.admin.messaging().sendEachForMulticast({
                    tokens: chunk,
                    notification: { title, body },
                    data: data ?? {},
                });
                successCount += response.successCount;
                failureCount += response.failureCount;
                response.responses.forEach((r, idx) => {
                    if (!r.success) {
                        const code = r.error?.code ?? '';
                        if (code === 'messaging/invalid-registration-token' ||
                            code === 'messaging/registration-token-not-registered') {
                            invalid.push(chunk[idx]);
                        }
                    }
                });
            }
            catch (err) {
                failureCount += chunk.length;
                this.logger.warn(`FCM multicast chunk failed: ${err.message}`);
            }
        }
        if (invalid.length) {
            await this.cleanupTokens(invalid);
        }
        return { successCount, failureCount };
    }
    async cleanupTokens(invalid) {
        if (!invalid.length)
            return;
        try {
            const candidates = await this.usersRepo
                .createQueryBuilder('u')
                .select(['u.id', 'u.fcmTokens'])
                .where('u.fcmTokens IS NOT NULL')
                .getMany();
            const invalidSet = new Set(invalid);
            for (const u of candidates) {
                const cur = Array.isArray(u.fcmTokens) ? u.fcmTokens : [];
                const next = cur.filter((t) => !invalidSet.has(t));
                if (next.length !== cur.length) {
                    await this.usersRepo.update(u.id, {
                        fcmTokens: next.length ? next : null,
                    });
                }
            }
            this.logger.log(`Cleaned ${invalid.length} invalid FCM token(s)`);
        }
        catch (err) {
            this.logger.warn(`FCM cleanup failed: ${err.message}`);
        }
    }
    async sendToUser(userId, title, body, data) {
        if (!this.enabled || !this.admin)
            return;
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'fcmTokens', 'pushNotificationsEnabled'],
        });
        if (!user)
            return;
        if (user.pushNotificationsEnabled === false)
            return;
        const tokens = Array.isArray(user.fcmTokens)
            ? user.fcmTokens.filter((t) => typeof t === 'string' && t.length > 0)
            : [];
        if (!tokens.length)
            return;
        try {
            const messaging = this.admin.messaging();
            const response = await messaging.sendEachForMulticast({
                tokens,
                notification: { title, body },
                data: data ?? {},
            });
            if (response.failureCount > 0) {
                const invalid = [];
                response.responses.forEach((r, idx) => {
                    if (!r.success) {
                        const code = r.error?.code ?? '';
                        if (code === 'messaging/invalid-registration-token' ||
                            code === 'messaging/registration-token-not-registered') {
                            invalid.push(tokens[idx]);
                        }
                    }
                });
                if (invalid.length) {
                    const remaining = tokens.filter((t) => !invalid.includes(t));
                    await this.usersRepo.update(userId, {
                        fcmTokens: remaining.length ? remaining : null,
                    });
                    this.logger.log(`Cleaned ${invalid.length} invalid FCM token(s) for user ${userId}`);
                }
            }
        }
        catch (err) {
            this.logger.warn(`FCM send failed: ${err.message}`);
        }
    }
    async broadcastToAll(title, body, data) {
        if (!this.enabled || !this.admin)
            return 0;
        try {
            const users = await this.usersRepo
                .createQueryBuilder('u')
                .select(['u.id', 'u.fcmTokens', 'u.pushNotificationsEnabled'])
                .where('u.pushNotificationsEnabled = :enabled', { enabled: true })
                .andWhere('u.fcmTokens IS NOT NULL')
                .getMany();
            let totalSuccess = 0;
            const invalid = [];
            for (const user of users) {
                const tokens = Array.isArray(user.fcmTokens)
                    ? user.fcmTokens.filter((t) => typeof t === 'string' && t.length > 0)
                    : [];
                if (!tokens.length)
                    continue;
                try {
                    const messaging = this.admin.messaging();
                    const response = await messaging.sendEachForMulticast({
                        tokens,
                        notification: { title, body },
                        data: data ?? {},
                    });
                    totalSuccess += response.successCount;
                    response.responses.forEach((r, idx) => {
                        if (!r.success) {
                            const code = r.error?.code ?? '';
                            if (code === 'messaging/invalid-registration-token' ||
                                code === 'messaging/registration-token-not-registered') {
                                invalid.push(tokens[idx]);
                            }
                        }
                    });
                }
                catch (err) {
                    this.logger.warn(`FCM broadcast to user ${user.id} failed: ${err.message}`);
                }
            }
            if (invalid.length) {
                await this.cleanupTokens(invalid);
            }
            return totalSuccess;
        }
        catch (err) {
            this.logger.warn(`FCM broadcast failed: ${err.message}`);
            return 0;
        }
    }
};
exports.FcmService = FcmService;
exports.FcmService = FcmService = FcmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], FcmService);
//# sourceMappingURL=fcm.service.js.map