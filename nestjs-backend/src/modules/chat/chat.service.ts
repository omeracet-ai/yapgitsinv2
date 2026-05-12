import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Between } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';
import {
  TranslateService,
  TranslateLang,
} from '../ai/translate.service';

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
  // Phase 78
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

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private messagesRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly translateService: TranslateService,
  ) {}

  /**
   * Phase 153: translate a chat message to targetLang.
   * Cached per-message in `translatedText` JSON column. Only the
   * sender or recipient may request translation.
   */
  async translateMessage(
    messageId: string,
    userId: string,
    targetLang: TranslateLang,
  ): Promise<{ translated: string; lang: TranslateLang; cached: boolean }> {
    const msg = await this.messagesRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Mesaj bulunamadı');
    if (msg.from !== userId && msg.to !== userId) {
      throw new ForbiddenException('Bu mesaja erişiminiz yok');
    }

    const cache = msg.translatedText ?? {};
    const existing = cache[targetLang];
    if (existing && existing.trim().length > 0) {
      return { translated: existing, lang: targetLang, cached: true };
    }

    const translated = await this.translateService.translate(
      msg.message ?? '',
      targetLang,
    );

    msg.translatedText = { ...cache, [targetLang]: translated };
    await this.messagesRepo.save(msg);
    return { translated, lang: targetLang, cached: false };
  }

  /**
   * Phase 162: send a new message from one user to another.
   */
  async sendMessage(
    from: string,
    dto: SendMessageDto,
  ): Promise<ChatMessage> {
    if (!from || !dto.to) {
      throw new BadRequestException('from ve to alanları gereklidir');
    }
    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('message boş olamaz');
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

  /**
   * Phase 162: get message history between two users.
   */
  async getMessageHistory(
    userId: string,
    peerId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const messages = await this.messagesRepo
      .createQueryBuilder('m')
      .where(
        '((m.from = :userId AND m.to = :peerId) OR (m.from = :peerId AND m.to = :userId))',
        { userId, peerId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(limit)
      .getMany();
    messages.reverse();
    return messages;
  }

  /**
   * Phase 162: get message history by job lead.
   */
  async getMessageHistoryByJobLead(
    userId: string,
    jobLeadId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    const messages = await this.messagesRepo
      .createQueryBuilder('m')
      .where(
        '(m.from = :userId OR m.to = :userId) AND m.jobLeadId = :jobLeadId',
        { userId, jobLeadId },
      )
      .orderBy('m.createdAt', 'DESC')
      .take(limit)
      .getMany();
    messages.reverse();
    return messages;
  }

  /**
   * Phase 69: list per-peer conversations for the given user.
   * Returns peer profile + last message + unread count.
   */
  async getConversations(userId: string): Promise<ConversationItem[]> {
    // Pull all messages involving this user, newest first.
    const rows = await this.messagesRepo
      .createQueryBuilder('m')
      .where('m.from = :uid OR m.to = :uid', { uid: userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    // Group by peer; first occurrence is the latest message because of DESC order.
    const peers = new Map<
      string,
      { last: ChatMessage; unread: number }
    >();
    for (const m of rows) {
      const peerId = m.from === userId ? m.to : m.from;
      if (!peerId) continue;
      const entry = peers.get(peerId);
      const isUnread = m.to === userId && m.readAt === null;
      if (entry) {
        if (isUnread) entry.unread += 1;
      } else {
        peers.set(peerId, { last: m, unread: isUnread ? 1 : 0 });
      }
    }

    if (peers.size === 0) return [];

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

    const result: ConversationItem[] = peerIds.map((pid) => {
      const { last, unread } = peers.get(pid)!;
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

    // Sort by latest message desc.
    result.sort(
      (a, b) =>
        b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
    return result;
  }

  /**
   * Phase 162: mark one or more messages as read by userId.
   */
  async markMessagesAsRead(
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;

    // Verify user can only mark their own received messages
    const messages = await this.messagesRepo.find({
      where: { id: In(messageIds) },
    });

    const unauthorizedIds = messages
      .filter((m) => m.to !== userId)
      .map((m) => m.id);
    if (unauthorizedIds.length > 0) {
      throw new ForbiddenException(
        `Bu mesajları işaretleme yetkiniz yok: ${unauthorizedIds.join(', ')}`,
      );
    }

    await this.messagesRepo.update(
      { id: In(messageIds), readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  /**
   * Phase 162: delete a message (only sender can delete).
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await this.messagesRepo.findOne({
      where: { id: messageId },
    });
    if (!msg) throw new NotFoundException('Mesaj bulunamadı');
    if (msg.from !== userId) {
      throw new ForbiddenException('Sadece kendi mesajlarınızı silebilirsiniz');
    }

    await this.messagesRepo.remove(msg);
  }

  /**
   * Phase 162: get total unread message count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.messagesRepo
      .createQueryBuilder('m')
      .where('m.to = :userId AND m.readAt IS NULL', { userId })
      .getCount();
    return count;
  }

  /**
   * Phase 162: get unread count per peer.
   */
  async getUnreadCountByPeer(
    userId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.messagesRepo
      .createQueryBuilder('m')
      .select('m.from', 'peerId')
      .addSelect('COUNT(m.id)', 'unreadCount')
      .where('m.to = :userId AND m.readAt IS NULL', { userId })
      .groupBy('m.from')
      .getRawMany();

    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(row.peerId, parseInt(row.unreadCount, 10));
    }
    return result;
  }

  /** Phase 78: presence query for a single user. */
  async getPresence(userId: string): Promise<PresenceState> {
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
}
