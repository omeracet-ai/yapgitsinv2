import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import { ContentFilterService } from '../moderation/content-filter.service';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { detectContact, maskContact } from '../../common/contact-filter';

export const CONTACT_BLOCK_SETTING_KEY = 'contact_sharing_block_enabled';

interface SendMessagePayload {
  from: string;
  to: string;
  message: string;
  jobId?: string | null;
  bookingId?: string | null;
}

interface GetHistoryPayload {
  userId: string;
  peerId?: string;
  jobId?: string;
  bookingId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Phase 78: in-memory presence tracking (userId → set of socket ids).
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly socketUser = new Map<string, string>();

  constructor(
    @InjectRepository(ChatMessage)
    private messagesRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private filter: ContentFilterService,
    private userBlocksService: UserBlocksService,
    private systemSettings: SystemSettingsService,
  ) {}

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth as { userId?: string } | undefined;
    const query = client.handshake.query as { userId?: string } | undefined;
    return auth?.userId ?? query?.userId ?? null;
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const userId = this.extractUserId(client);
    if (!userId) return;
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

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = this.socketUser.get(client.id);
    if (!userId) return;
    this.socketUser.delete(client.id);
    const set = this.userSockets.get(userId);
    if (!set) return;
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

  /** Phase 78: helper for ChatService — read live presence state. */
  isUserOnline(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!set && set.size > 0;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: SendMessagePayload,
    @ConnectedSocket() _client: Socket,
  ) {
    this.logger.debug(
      `Message event: from=${data.from} to=${data.to} jobId=${data.jobId ?? '-'} bookingId=${data.bookingId ?? '-'}`,
    );
    if (data.from && data.to) {
      const blocked = await this.userBlocksService.isEitherBlocked(
        data.from,
        data.to,
      );
      if (blocked) {
        _client.emit('error', {
          type: 'blocked',
          message: 'Bu kullanıcıyla mesajlaşma engellendi',
        });
        return;
      }
    }
    // Phase 77: contact-sharing block (admin toggle)
    let workingMessage = data.message;
    let contactFiltered = false;
    let detectedContactTypes: string[] = [];
    const blockEnabled = await this.systemSettings.get(
      CONTACT_BLOCK_SETTING_KEY,
      'true',
    );
    if (blockEnabled === 'true') {
      detectedContactTypes = detectContact(workingMessage);
      if (detectedContactTypes.length > 0) {
        workingMessage = maskContact(workingMessage);
        contactFiltered = true;
      }
    }

    const result = this.filter.check(workingMessage);
    const flagReasons: string[] = result.flagged ? [...result.reasons] : [];
    if (contactFiltered) flagReasons.push(`contact:${detectedContactTypes.join('|')}`);
    const saved = await this.messagesRepo.save({
      from: data.from,
      to: data.to,
      message: workingMessage,
      jobId: data.jobId ?? null,
      bookingId: data.bookingId ?? null,
      flagged: result.flagged || contactFiltered,
      flagReason: flagReasons.length ? flagReasons.join(',') : null,
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
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: { roomId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to others in the same room (sender excluded).
    client.to(data.roomId).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  // Phase 68: mark a batch of messages as read and broadcast to room peers.
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { messageIds: string[]; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.messageIds || data.messageIds.length === 0) return;
    const readAt = new Date();
    await this.messagesRepo.update(
      { id: In(data.messageIds), readAt: IsNull() },
      { readAt },
    );
    client.to(data.roomId).emit('messagesRead', {
      messageIds: data.messageIds,
      readAt: readAt.toISOString(),
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(roomId);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody() data: GetHistoryPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const qb = this.messagesRepo.createQueryBuilder('m');

    // Context filters take precedence; both can be combined with peer filter.
    if (data.jobId) {
      qb.andWhere('m.jobId = :jobId', { jobId: data.jobId });
    }
    if (data.bookingId) {
      qb.andWhere('m.bookingId = :bookingId', { bookingId: data.bookingId });
    }

    if (data.peerId) {
      // Restrict to the conversation between userId and peerId.
      qb.andWhere(
        '((m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId))',
        { userId: data.userId, peerId: data.peerId },
      );
    } else if (!data.jobId && !data.bookingId) {
      // No filter at all — fall back to messages involving userId.
      qb.andWhere('(m.from = :userId OR m.to = :userId)', {
        userId: data.userId,
      });
    }

    // Newest 100, returned in chronological order for UI.
    const messages = await qb
      .orderBy('m.createdAt', 'DESC')
      .take(100)
      .getMany();
    messages.reverse();

    client.emit('chatHistory', messages);
  }
}
