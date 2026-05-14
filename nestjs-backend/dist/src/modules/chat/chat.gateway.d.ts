import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import { ContentFilterService } from '../moderation/content-filter.service';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare const CONTACT_BLOCK_SETTING_KEY = "contact_sharing_block_enabled";
interface SendMessagePayload {
    from: string;
    to: string;
    message: string;
    jobId?: string | null;
    bookingId?: string | null;
    attachmentUrl?: string | null;
    attachmentType?: 'image' | 'document' | 'audio' | null;
    attachmentName?: string | null;
    attachmentSize?: number | null;
    attachmentDuration?: number | null;
}
interface GetHistoryPayload {
    userId: string;
    peerId?: string;
    jobId?: string;
    bookingId?: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private messagesRepo;
    private usersRepo;
    private filter;
    private userBlocksService;
    private systemSettings;
    private notificationsService;
    server: Server;
    private readonly logger;
    private readonly userSockets;
    private readonly socketUser;
    constructor(messagesRepo: Repository<ChatMessage>, usersRepo: Repository<User>, filter: ContentFilterService, userBlocksService: UserBlocksService, systemSettings: SystemSettingsService, notificationsService: NotificationsService);
    private extractUserId;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    isUserOnline(userId: string): boolean;
    handleMessage(data: SendMessagePayload, _client: Socket): Promise<void>;
    handleTyping(data: {
        roomId: string;
        userId: string;
        isTyping: boolean;
    }, client: Socket): void;
    handleMarkRead(data: {
        messageIds: string[];
        roomId: string;
    }, client: Socket): Promise<void>;
    handleJoinRoom(roomId: string, client: Socket): void;
    handleGetHistory(data: GetHistoryPayload, client: Socket): Promise<void>;
}
export {};
