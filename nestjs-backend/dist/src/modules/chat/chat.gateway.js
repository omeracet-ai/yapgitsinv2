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
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = exports.CONTACT_BLOCK_SETTING_KEY = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const socket_io_1 = require("socket.io");
const chat_message_entity_1 = require("./chat-message.entity");
const user_entity_1 = require("../users/user.entity");
const content_filter_service_1 = require("../moderation/content-filter.service");
const user_blocks_service_1 = require("../user-blocks/user-blocks.service");
const system_settings_service_1 = require("../system-settings/system-settings.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const contact_filter_1 = require("../../common/contact-filter");
exports.CONTACT_BLOCK_SETTING_KEY = 'contact_sharing_block_enabled';
let ChatGateway = ChatGateway_1 = class ChatGateway {
    messagesRepo;
    usersRepo;
    filter;
    userBlocksService;
    systemSettings;
    notificationsService;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    userSockets = new Map();
    socketUser = new Map();
    constructor(messagesRepo, usersRepo, filter, userBlocksService, systemSettings, notificationsService) {
        this.messagesRepo = messagesRepo;
        this.usersRepo = usersRepo;
        this.filter = filter;
        this.userBlocksService = userBlocksService;
        this.systemSettings = systemSettings;
        this.notificationsService = notificationsService;
    }
    extractUserId(client) {
        const auth = client.handshake.auth;
        const query = client.handshake.query;
        return auth?.userId ?? query?.userId ?? null;
    }
    async handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        const userId = this.extractUserId(client);
        if (!userId)
            return;
        this.socketUser.set(client.id, userId);
        let set = this.userSockets.get(userId);
        if (!set) {
            set = new Set();
            this.userSockets.set(userId, set);
        }
        const wasOffline = set.size === 0;
        set.add(client.id);
        if (wasOffline) {
            await this.usersRepo.update(userId, { isOnline: true });
            client.broadcast.emit('presence', { userId, isOnline: true });
        }
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const userId = this.socketUser.get(client.id);
        if (!userId)
            return;
        this.socketUser.delete(client.id);
        const set = this.userSockets.get(userId);
        if (!set)
            return;
        set.delete(client.id);
        if (set.size === 0) {
            this.userSockets.delete(userId);
            const lastSeenAt = new Date();
            await this.usersRepo.update(userId, { isOnline: false, lastSeenAt });
            this.server.emit('presence', {
                userId,
                isOnline: false,
                lastSeenAt: lastSeenAt.toISOString(),
            });
        }
    }
    isUserOnline(userId) {
        const set = this.userSockets.get(userId);
        return !!set && set.size > 0;
    }
    async handleMessage(data, _client) {
        this.logger.debug(`Message event: from=${data.from} to=${data.to} jobId=${data.jobId ?? '-'} bookingId=${data.bookingId ?? '-'}`);
        if (data.from && data.to) {
            const blocked = await this.userBlocksService.isEitherBlocked(data.from, data.to);
            if (blocked) {
                _client.emit('error', {
                    type: 'blocked',
                    message: 'Bu kullanıcıyla mesajlaşma engellendi',
                });
                return;
            }
        }
        let workingMessage = data.message;
        let contactFiltered = false;
        let detectedContactTypes = [];
        const blockEnabled = await this.systemSettings.get(exports.CONTACT_BLOCK_SETTING_KEY, 'true');
        if (blockEnabled === 'true') {
            detectedContactTypes = (0, contact_filter_1.detectContact)(workingMessage);
            if (detectedContactTypes.length > 0) {
                workingMessage = (0, contact_filter_1.maskContact)(workingMessage);
                contactFiltered = true;
            }
        }
        const result = this.filter.check(workingMessage);
        const flagReasons = result.flagged ? [...result.reasons] : [];
        if (contactFiltered)
            flagReasons.push(`contact:${detectedContactTypes.join('|')}`);
        const saved = await this.messagesRepo.save({
            from: data.from,
            to: data.to,
            message: workingMessage,
            jobId: data.jobId ?? null,
            bookingId: data.bookingId ?? null,
            flagged: result.flagged || contactFiltered,
            flagReason: flagReasons.length ? flagReasons.join(',') : null,
            attachmentUrl: data.attachmentUrl ?? null,
            attachmentType: data.attachmentType ?? null,
            attachmentName: data.attachmentName ?? null,
            attachmentSize: data.attachmentSize ?? null,
            attachmentDuration: data.attachmentDuration ?? null,
        });
        if (contactFiltered) {
            _client.emit('messageFiltered', {
                reason: 'contact_block',
                detectedTypes: detectedContactTypes,
                messageId: saved.id,
            });
        }
        const broadcastMessage = result.flagged
            ? this.filter.sanitize(workingMessage)
            : workingMessage;
        this.server.emit('receiveMessage', {
            ...data,
            message: broadcastMessage,
            jobId: saved.jobId,
            bookingId: saved.bookingId,
            id: saved.id,
            flagged: saved.flagged,
            createdAt: saved.createdAt,
            attachmentUrl: saved.attachmentUrl,
            attachmentType: saved.attachmentType,
            attachmentName: saved.attachmentName,
            attachmentSize: saved.attachmentSize,
            attachmentDuration: saved.attachmentDuration,
        });
        void (async () => {
            try {
                const recipient = await this.usersRepo.findOne({
                    where: { id: data.to },
                    select: ['id', 'fullName'],
                });
                if (!recipient)
                    return;
                const isOnline = this.isUserOnline(data.to);
                if (!isOnline) {
                    const senderName = await this.usersRepo.findOne({
                        where: { id: data.from },
                        select: ['id', 'fullName'],
                    });
                    await this.notificationsService.send({
                        userId: data.to,
                        type: notification_entity_1.NotificationType.SYSTEM,
                        title: `Yeni mesaj: ${senderName?.fullName ?? 'Kullanıcı'}`,
                        body: broadcastMessage.substring(0, 100),
                        refId: data.from,
                        relatedType: 'user',
                        relatedId: data.from,
                    });
                }
            }
            catch (err) {
                this.logger.warn(`Failed to send message notification: ${err.message}`);
            }
        })();
    }
    handleTyping(data, client) {
        client.to(data.roomId).emit('userTyping', {
            userId: data.userId,
            isTyping: data.isTyping,
        });
    }
    async handleMarkRead(data, client) {
        if (!data.messageIds || data.messageIds.length === 0)
            return;
        const readAt = new Date();
        await this.messagesRepo.update({ id: (0, typeorm_2.In)(data.messageIds), readAt: (0, typeorm_2.IsNull)() }, { readAt });
        client.to(data.roomId).emit('messagesRead', {
            messageIds: data.messageIds,
            readAt: readAt.toISOString(),
        });
    }
    handleJoinRoom(roomId, client) {
        void client.join(roomId);
        this.logger.log(`Client ${client.id} joined room ${roomId}`);
    }
    async handleGetHistory(data, client) {
        const qb = this.messagesRepo.createQueryBuilder('m');
        if (data.jobId) {
            qb.andWhere('m.jobId = :jobId', { jobId: data.jobId });
        }
        if (data.bookingId) {
            qb.andWhere('m.bookingId = :bookingId', { bookingId: data.bookingId });
        }
        if (data.peerId) {
            qb.andWhere('((m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId))', { userId: data.userId, peerId: data.peerId });
        }
        else if (!data.jobId && !data.bookingId) {
            qb.andWhere('(m.from = :userId OR m.to = :userId)', {
                userId: data.userId,
            });
        }
        const messages = await qb
            .orderBy('m.createdAt', 'DESC')
            .take(100)
            .getMany();
        messages.reverse();
        client.emit('chatHistory', messages);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('markRead'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getHistory'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleGetHistory", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.ALLOWED_ORIGINS
                ? process.env.ALLOWED_ORIGINS.split(',')
                : '*',
        },
    }),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        content_filter_service_1.ContentFilterService,
        user_blocks_service_1.UserBlocksService,
        system_settings_service_1.SystemSettingsService,
        notifications_service_1.NotificationsService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map