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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { detectContact, maskContact } from '../../common/contact-filter';
import { RealtimeService } from '../realtime/realtime.service';
import { ChatService } from './chat.service';
import { stripHtml } from '../../common/utils/strip-html';
import { verifyJwtWithRotation } from '../auth/jwt-secrets';
// Phase 519 — WebSocket payload'ı ValidationPipe'tan geçmez; gateway içinde
// inbound message HTML strip edilir (stored XSS koruması).
// Phase 537 — CRITICAL — handshake JWT verify; legacy userId-only auth'a düşüş
// CHAT_STRICT_AUTH=1 ile kapatılır. Impersonation kapatıldı.

export const CONTACT_BLOCK_SETTING_KEY = 'contact_sharing_block_enabled';

interface SendMessagePayload {
  from: string;
  to: string;
  message: string;
  jobId?: string | null;
  bookingId?: string | null;
  // Phase 139: optional attachment metadata
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'document' | 'audio' | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  // Phase 151: voice note duration (seconds).
  attachmentDuration?: number | null;
}

interface GetHistoryPayload {
  userId: string;
  peerId?: string;
  jobId?: string;
  bookingId?: string;
}

// Phase 540N — CORS wildcard `*` production'da kredentialsız broadcast dinleme
// riski. Dev'de `*`, prod'da ALLOWED_ORIGINS env zorunlu (yoksa origin
// callback ile aynı origin'e izin ver, cross-origin reddedilir).
@WebSocketGateway({
  cors: {
    origin: (() => {
      const allow = process.env.ALLOWED_ORIGINS;
      if (allow && allow.trim()) return allow.split(',').map((s) => s.trim());
      if (process.env.NODE_ENV === 'production') {
        // Prod'da liste yoksa cross-origin ws bağlantısı reject; same-origin
        // (Origin header eşleşmesi) socket.io tarafından handle edilir.
        return false;
      }
      return true; // dev: aç
    })(),
    credentials: true,
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
    private notificationsService: NotificationsService,
    private realtime: RealtimeService,
    private chatService: ChatService,
  ) {}

  /**
   * Phase 537 — Presence privacy: only emit `presence` events to sockets whose
   * user shares at least one chat_message with this user. Prevents whole
   * userbase presence broadcast leak. Called on connect / disconnect.
   */
  private async emitPresenceToPeers(payload: {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string;
  }): Promise<void> {
    try {
      const rows: Array<{ peer: string }> = await this.messagesRepo
        .createQueryBuilder('m')
        .select(
          `CASE WHEN m."from" = :uid THEN m."to" ELSE m."from" END`,
          'peer',
        )
        .where('m."from" = :uid OR m."to" = :uid', { uid: payload.userId })
        .distinct(true)
        .getRawMany();
      const peers = rows.map((r) => r.peer).filter(Boolean);
      if (peers.length === 0) return;
      let emit = this.server.to(`user:${payload.userId}`);
      for (const p of peers) emit = emit.to(`user:${p}`);
      emit.emit('presence', payload);
    } catch (e) {
      this.logger.warn(
        `presence peer fanout failed for ${payload.userId}: ${(e as Error).message}`,
      );
    }
  }

  private extractUserId(client: Socket): string | null {
    const auth = client.handshake.auth as
      | { token?: string; userId?: string }
      | undefined;
    const query = client.handshake.query as
      | { token?: string; userId?: string }
      | undefined;
    // Prefer signed JWT. Falls back to legacy `userId` only when
    // CHAT_STRICT_AUTH !== '1' (compat window during rollout).
    const rawToken =
      (typeof auth?.token === 'string' && auth.token) ||
      (typeof query?.token === 'string' && query.token) ||
      null;
    if (rawToken) {
      try {
        const payload = verifyJwtWithRotation<{ sub?: string; id?: string }>(
          rawToken,
        );
        const sub = payload.sub || payload.id;
        if (sub) return sub;
      } catch (e) {
        this.logger.warn(
          `Socket JWT verify failed (${client.id}): ${(e as Error).message}`,
        );
        return null;
      }
    }
    if (process.env.CHAT_STRICT_AUTH === '1') return null;
    // Legacy — soft fallback so pre-Phase-537 clients keep working; will be
    // removed once CHAT_STRICT_AUTH=1 flips in prod.
    const legacy =
      (typeof auth?.userId === 'string' && auth.userId) ||
      (typeof query?.userId === 'string' && query.userId) ||
      null;
    if (legacy) {
      this.logger.warn(
        `Socket legacy userId auth (${client.id}, uid=${legacy}) — enable CHAT_STRICT_AUTH=1 after client rollout`,
      );
    }
    return legacy;
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const userId = this.extractUserId(client);
    if (!userId) {
      client.emit('error', {
        type: 'unauthorized',
        message: 'chat: token required',
      });
      client.disconnect(true);
      return;
    }
    client.data.userId = userId;
    this.socketUser.set(client.id, userId);
    // Phase 268 — feed admin Realtime Analytics tracker.
    this.realtime.add(userId, client.id);
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    const wasOffline = set.size === 0;
    set.add(client.id);
    client.join(`user:${userId}`);
    if (wasOffline) {
      await this.usersRepo.update(userId, { isOnline: true });
      await this.emitPresenceToPeers({ userId, isOnline: true });
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = this.socketUser.get(client.id);
    if (!userId) return;
    this.socketUser.delete(client.id);
    // Phase 268 — admin realtime tracker.
    this.realtime.remove(client.id);
    const set = this.userSockets.get(userId);
    if (!set) return;
    set.delete(client.id);
    if (set.size === 0) {
      this.userSockets.delete(userId);
      const lastSeenAt = new Date();
      await this.usersRepo.update(userId, { isOnline: false, lastSeenAt });
      await this.emitPresenceToPeers({
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
      // Phase 305 + 501 — Accepted-offer gate + owner-initiated rule.
      // Usta ilk mesajı atamaz; ilan sahibi (customer) en az 1 mesaj
      // gönderene kadar (Phase 401 hoşgeldin dahil) engellenir.
      const gate = await this.chatService.canSend(data.from, data.to);
      if (!gate.allowed) {
        _client.emit('error', {
          type: gate.reason,
          message:
            gate.reason === 'owner_must_initiate'
              ? 'Mesajlaşmayı sadece ilan sahibi başlatabilir. Lütfen ilan sahibinin ilk mesajını bekleyin.'
              : 'Mesajlaşma sadece teklifi kabul edilmiş kullanıcılar arasında açılır.',
        });
        return;
      }
    }
    // Phase 519 — HTML/script strip on inbound message.
    let workingMessage =
      typeof data.message === 'string' ? stripHtml(data.message) : '';
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
    this.server
      .to(`user:${data.to}`)
      .to(`user:${data.from}`)
      .emit('receiveMessage', {
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

    // Phase 490 — her mesaj için bildirim oluştur (online/offline ayrımı yok).
    // Bell badge'in her durumda artması için gate kaldırıldı. FCM/SMS
    // NotificationsService.send() içinde fan-out edilir.
    void (async () => {
      try {
        const recipient = await this.usersRepo.findOne({
          where: { id: data.to },
          select: ['id', 'fullName'],
        });
        if (!recipient) return;
        const senderName = await this.usersRepo.findOne({
          where: { id: data.from },
          select: ['id', 'fullName'],
        });
        await this.notificationsService.send({
          userId: data.to,
          type: NotificationType.NEW_MESSAGE,
          title: `Yeni mesaj: ${senderName?.fullName ?? 'Kullanıcı'}`,
          body: broadcastMessage.substring(0, 100),
          refId: data.from,
          relatedType: 'user',
          relatedId: data.from,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send message notification: ${(err as Error).message}`,
        );
      }
    })();
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: { roomId: string; userId?: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Phase 540i — userId artık client payload'ından değil authenticated
    // socket'ten alınır (typing indicator impersonation kapatıldı).
    const userId = client.data.userId as string | undefined;
    if (!userId || !data.roomId) return;
    client.to(data.roomId).emit('userTyping', {
      userId,
      isTyping: data.isTyping === true,
    });
  }

  // Phase 68: mark a batch of messages as read and broadcast to room peers.
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { messageIds: string[]; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (
      !Array.isArray(data.messageIds) ||
      data.messageIds.length === 0 ||
      data.messageIds.length > 200
    )
      return;
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const readAt = new Date();
    const result = await this.messagesRepo.update(
      { id: In(data.messageIds), to: userId, readAt: IsNull() },
      { readAt },
    );
    if (!result.affected) return;
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
    if (typeof roomId !== 'string' || !roomId || roomId.length > 128) return;
    // Phase 540i — cross-chat delivery leak fix: kullanıcı yeni bir DM
    // odasına girmeden önce eski DM odasını bırak. `user:<uid>` ve default
    // socket odaları korunur (socket.rooms içinde socket.id ve user room).
    const preserved = new Set<string>([client.id]);
    const uid = client.data.userId as string | undefined;
    if (uid) preserved.add(`user:${uid}`);
    for (const r of Array.from(client.rooms)) {
      if (preserved.has(r) || r === roomId) continue;
      if (r.startsWith('dm:') || r.startsWith('room:')) {
        void client.leave(r);
      }
    }
    void client.join(roomId);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody() data: GetHistoryPayload,
    @ConnectedSocket() client: Socket,
  ) {
    // Derive userId from the authenticated socket, never trust payload.
    const authUserId = this.socketUser.get(client.id);
    if (!authUserId || (data.userId && data.userId !== authUserId)) {
      client.emit('error', { type: 'unauthorized', message: 'unauthorized' });
      return;
    }
    data = { ...data, userId: authUserId };
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
