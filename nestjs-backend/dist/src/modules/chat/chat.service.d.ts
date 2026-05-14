import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import { TranslateService, TranslateLang } from '../ai/translate.service';
export interface ConversationItem {
    peerId: string;
    peerName: string | null;
    peerAvatarUrl: string | null;
    lastMessage: {
        id: string;
        text: string;
        createdAt: Date;
        fromMe: boolean;
        jobLeadId?: string | null;
    };
    unreadCount: number;
    peerOnline: boolean;
    peerLastSeenAt: string | null;
}
export interface PresenceState {
    userId: string;
    isOnline: boolean;
    lastSeenAt: string | null;
}
export interface SendMessageDto {
    to: string;
    message: string;
    jobLeadId?: string | null;
    jobId?: string | null;
    bookingId?: string | null;
}
export declare class ChatService {
    private messagesRepo;
    private usersRepo;
    private readonly translateService;
    constructor(messagesRepo: Repository<ChatMessage>, usersRepo: Repository<User>, translateService: TranslateService);
    translateMessage(messageId: string, userId: string, targetLang: TranslateLang): Promise<{
        translated: string;
        lang: TranslateLang;
        cached: boolean;
    }>;
    sendMessage(from: string, dto: SendMessageDto): Promise<ChatMessage>;
    getMessageHistory(userId: string, peerId: string, limit?: number): Promise<ChatMessage[]>;
    getMessageHistoryByJobLead(userId: string, jobLeadId: string, limit?: number): Promise<ChatMessage[]>;
    getConversations(userId: string): Promise<ConversationItem[]>;
    markMessagesAsRead(messageIds: string[], userId: string): Promise<void>;
    deleteMessage(messageId: string, userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
    getUnreadCountByPeer(userId: string): Promise<Map<string, number>>;
    getPresence(userId: string): Promise<PresenceState>;
}
