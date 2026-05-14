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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_message_entity_1 = require("./chat-message.entity");
const user_entity_1 = require("../users/user.entity");
const translate_service_1 = require("../ai/translate.service");
let ChatService = class ChatService {
    messagesRepo;
    usersRepo;
    translateService;
    constructor(messagesRepo, usersRepo, translateService) {
        this.messagesRepo = messagesRepo;
        this.usersRepo = usersRepo;
        this.translateService = translateService;
    }
    async translateMessage(messageId, userId, targetLang) {
        const msg = await this.messagesRepo.findOne({ where: { id: messageId } });
        if (!msg)
            throw new common_1.NotFoundException('Mesaj bulunamadı');
        if (msg.from !== userId && msg.to !== userId) {
            throw new common_1.ForbiddenException('Bu mesaja erişiminiz yok');
        }
        const cache = msg.translatedText ?? {};
        const existing = cache[targetLang];
        if (existing && existing.trim().length > 0) {
            return { translated: existing, lang: targetLang, cached: true };
        }
        const translated = await this.translateService.translate(msg.message ?? '', targetLang);
        msg.translatedText = { ...cache, [targetLang]: translated };
        await this.messagesRepo.save(msg);
        return { translated, lang: targetLang, cached: false };
    }
    async sendMessage(from, dto) {
        if (!from || !dto.to) {
            throw new common_1.BadRequestException('from ve to alanları gereklidir');
        }
        if (!dto.message || dto.message.trim().length === 0) {
            throw new common_1.BadRequestException('message boş olamaz');
        }
        const msg = await this.messagesRepo.save({
            from,
            to: dto.to,
            message: dto.message.trim(),
            jobLeadId: dto.jobLeadId ?? null,
            jobId: dto.jobId ?? null,
            bookingId: dto.bookingId ?? null,
            deliveryStatus: 'sent',
        });
        return msg;
    }
    async getMessageHistory(userId, peerId, limit = 50) {
        const messages = await this.messagesRepo
            .createQueryBuilder('m')
            .where('((m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId))', { userId, peerId })
            .orderBy('m.createdAt', 'DESC')
            .take(limit)
            .getMany();
        messages.reverse();
        return messages;
    }
    async getMessageHistoryByJobLead(userId, jobLeadId, limit = 50) {
        const messages = await this.messagesRepo
            .createQueryBuilder('m')
            .where('(m.from = :userId OR m.to = :userId) AND m.jobLeadId = :jobLeadId', { userId, jobLeadId })
            .orderBy('m.createdAt', 'DESC')
            .take(limit)
            .getMany();
        messages.reverse();
        return messages;
    }
    async getConversations(userId) {
        const rows = await this.messagesRepo
            .createQueryBuilder('m')
            .where('m.from = :uid OR m.to = :uid', { uid: userId })
            .orderBy('m.createdAt', 'DESC')
            .getMany();
        const peers = new Map();
        for (const m of rows) {
            const peerId = m.from === userId ? m.to : m.from;
            if (!peerId)
                continue;
            const entry = peers.get(peerId);
            const isUnread = m.to === userId && m.readAt === null;
            if (entry) {
                if (isUnread)
                    entry.unread += 1;
            }
            else {
                peers.set(peerId, { last: m, unread: isUnread ? 1 : 0 });
            }
        }
        if (peers.size === 0)
            return [];
        const peerIds = Array.from(peers.keys());
        const users = await this.usersRepo
            .createQueryBuilder('u')
            .select([
            'u.id',
            'u.fullName',
            'u.profileImageUrl',
            'u.isOnline',
            'u.lastSeenAt',
        ])
            .where('u.id IN (:...ids)', { ids: peerIds })
            .getMany();
        const userMap = new Map(users.map((u) => [u.id, u]));
        const result = peerIds.map((pid) => {
            const { last, unread } = peers.get(pid);
            const u = userMap.get(pid);
            return {
                peerId: pid,
                peerName: u?.fullName ?? null,
                peerAvatarUrl: u?.profileImageUrl ?? null,
                lastMessage: {
                    id: last.id,
                    text: last.message,
                    createdAt: last.createdAt,
                    fromMe: last.from === userId,
                    jobLeadId: last.jobLeadId,
                },
                unreadCount: unread,
                peerOnline: u?.isOnline ?? false,
                peerLastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
            };
        });
        result.sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime());
        return result;
    }
    async markMessagesAsRead(messageIds, userId) {
        if (!messageIds || messageIds.length === 0)
            return;
        const messages = await this.messagesRepo.find({
            where: { id: (0, typeorm_2.In)(messageIds) },
        });
        const unauthorizedIds = messages
            .filter((m) => m.to !== userId)
            .map((m) => m.id);
        if (unauthorizedIds.length > 0) {
            throw new common_1.ForbiddenException(`Bu mesajları işaretleme yetkiniz yok: ${unauthorizedIds.join(', ')}`);
        }
        await this.messagesRepo.update({ id: (0, typeorm_2.In)(messageIds), readAt: (0, typeorm_2.IsNull)() }, { readAt: new Date() });
    }
    async deleteMessage(messageId, userId) {
        const msg = await this.messagesRepo.findOne({
            where: { id: messageId },
        });
        if (!msg)
            throw new common_1.NotFoundException('Mesaj bulunamadı');
        if (msg.from !== userId) {
            throw new common_1.ForbiddenException('Sadece kendi mesajlarınızı silebilirsiniz');
        }
        await this.messagesRepo.remove(msg);
    }
    async getUnreadCount(userId) {
        const count = await this.messagesRepo
            .createQueryBuilder('m')
            .where('m.to = :userId AND m.readAt IS NULL', { userId })
            .getCount();
        return count;
    }
    async getUnreadCountByPeer(userId) {
        const rows = await this.messagesRepo
            .createQueryBuilder('m')
            .select('m.from', 'peerId')
            .addSelect('COUNT(m.id)', 'unreadCount')
            .where('m.to = :userId AND m.readAt IS NULL', { userId })
            .groupBy('m.from')
            .getRawMany();
        const result = new Map();
        for (const row of rows) {
            result.set(row.peerId, parseInt(row.unreadCount, 10));
        }
        return result;
    }
    async getPresence(userId) {
        const u = await this.usersRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.isOnline', 'u.lastSeenAt'])
            .where('u.id = :id', { id: userId })
            .getOne();
        return {
            userId,
            isOnline: u?.isOnline ?? false,
            lastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        translate_service_1.TranslateService])
], ChatService);
//# sourceMappingURL=chat.service.js.map