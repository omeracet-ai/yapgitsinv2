import { ChatService } from './chat.service';
import type { SendMessageDto } from './chat.service';
import type { TranslateLang } from '../ai/translate.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class ChatController {
    private readonly svc;
    constructor(svc: ChatService);
    sendMessage(dto: SendMessageDto, req: AuthenticatedRequest): Promise<import("./chat-message.entity").ChatMessage>;
    getHistory(peerId: string, req: AuthenticatedRequest): Promise<import("./chat-message.entity").ChatMessage[]>;
    getConversations(req: AuthenticatedRequest): Promise<import("./chat.service").ConversationItem[]>;
    markAsRead(id: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
    markManyAsRead(body: {
        messageIds: string[];
    }, req: AuthenticatedRequest): Promise<{
        success: boolean;
        markedCount: number;
    }>;
    getUnreadCount(req: AuthenticatedRequest): Promise<{
        unreadCount: number;
    }>;
    deleteMessage(id: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
    getPresence(userId: string): Promise<import("./chat.service").PresenceState>;
    translateMessage(id: string, body: {
        targetLang: TranslateLang;
    }, req: AuthenticatedRequest): Promise<{
        translated: string;
        lang: TranslateLang;
        cached: boolean;
    }>;
}
