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
import { Offer, OfferStatus } from '../jobs/offer.entity';
import { Job } from '../jobs/job.entity';
import { TranslateService, TranslateLang } from '../ai/translate.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

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
    @InjectRepository(Offer)
    private offersRepo: Repository<Offer>,
    @InjectRepository(Job)
    private jobsRepo: Repository<Job>,
    private readonly translateService: TranslateService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Phase 503 — Mesaj → bildirim fan-out helper. Hem HTTP sendMessage hem
   * acceptance welcome insert tarafından paylaşılır. WebSocket gateway zaten
   * Phase 490'da kendi notification.send'ini çağırıyor (orada da NEW_MESSAGE).
   */
  private async fanOutMessageNotification(params: {
    fromUserId: string;
    toUserId: string;
    bodyPreview: string;
  }): Promise<void> {
    try {
      const sender = await this.usersRepo.findOne({
        where: { id: params.fromUserId },
        select: ['id', 'fullName'],
      });
      await this.notificationsService.send({
        userId: params.toUserId,
        type: NotificationType.NEW_MESSAGE,
        title: `Yeni mesaj: ${sender?.fullName ?? 'Kullanıcı'}`,
        body: params.bodyPreview.substring(0, 100),
        refId: params.fromUserId,
        relatedType: 'user',
        relatedId: params.fromUserId,
      });
    } catch {
      // sessiz — mesaj save'i zaten başarılı, bildirim fan-out best-effort.
    }
  }

  /**
   * Phase 305 — Accepted-offer chat gate.
   * İki kullanıcı arasında mesajlaşma için ortak bir kabul edilmiş teklif
   * (status='accepted') gereklidir: o teklifi veren usta (offer.userId) ile
   * ilanın sahibi müşterisi (job.customerId) çiftine açık.
   */
  async getAcceptedPeers(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();
    const rows = await this.offersRepo
      .createQueryBuilder('o')
      .innerJoin(Job, 'j', 'j.id = o.jobId')
      .where('o.status = :st', { st: OfferStatus.ACCEPTED })
      .andWhere('(o.userId = :uid OR j.customerId = :uid)', { uid: userId })
      .select(['o.userId AS workerId', 'j.customerId AS customerId'])
      .getRawMany<{ workerId: string; customerId: string }>();
    const peers = new Set<string>();
    for (const r of rows) {
      if (r.workerId === userId && r.customerId) peers.add(r.customerId);
      else if (r.customerId === userId && r.workerId) peers.add(r.workerId);
    }
    return peers;
  }

  /// Phase 401 — Teklif kabul edildiğinde Mesajlarım listesinde iki taraf
  /// arasında konuşmanın anında belirmesi için sistem hoşgeldin mesajı insert.
  /// İlan sahibi tarafından usta'ya gönderilmiş gibi yazılır (single direction
  /// — getConversations any-direction message yakalar).
  async createAcceptanceWelcome(params: {
    fromUserId: string;
    toUserId: string;
    jobId: string;
    jobTitle: string;
  }): Promise<void> {
    const body =
      `🎉 "${params.jobTitle}" ilanı için teklifiniz kabul edildi. ` +
      `Mesajlaşmaya başlayabilirsiniz.`;
    const msg = this.messagesRepo.create({
      from: params.fromUserId,
      to: params.toUserId,
      jobId: params.jobId,
      message: body,
    });
    await this.messagesRepo.save(msg);
    // Phase 503 — hoşgeldin mesajı da bildirimler listesine düşsün.
    void this.fanOutMessageNotification({
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      bodyPreview: body,
    });
  }

  async canChat(userA: string, userB: string): Promise<boolean> {
    if (!userA || !userB || userA === userB) return false;
    const peers = await this.getAcceptedPeers(userA);
    return peers.has(userB);
  }

  /**
   * Phase 501 — Sıkı kural: mesajlaşmayı SADECE ilan sahibi (customer)
   * başlatabilir. Usta (worker) ilk mesaj atamaz; ilan sahibi en az 1 mesaj
   * gönderene kadar (Phase 401 hoşgeldin auto-insert dahil) usta engellenir.
   *
   * Dönüşler:
   *   { allowed: true }                                  → gönderebilir
   *   { allowed: false, reason: 'no_accepted_offer' }    → çift için kabul yok
   *   { allowed: false, reason: 'owner_must_initiate' } → usta önce müşteri
   *                                                       başlatmalı
   */
  async canSend(
    from: string,
    to: string,
  ): Promise<
    | { allowed: true }
    | { allowed: false; reason: 'no_accepted_offer' | 'owner_must_initiate' }
  > {
    if (!from || !to || from === to) {
      return { allowed: false, reason: 'no_accepted_offer' };
    }
    // 1) Çift için herhangi bir accepted offer var mı + kim customer / worker?
    const row = await this.offersRepo
      .createQueryBuilder('o')
      .innerJoin(Job, 'j', 'j.id = o.jobId')
      .where('o.status = :st', { st: OfferStatus.ACCEPTED })
      .andWhere(
        '((o.userId = :a AND j.customerId = :b) OR (o.userId = :b AND j.customerId = :a))',
        { a: from, b: to },
      )
      .select(['o.userId AS workerId', 'j.customerId AS customerId'])
      .getRawOne<{ workerId: string; customerId: string }>();
    if (!row) {
      return { allowed: false, reason: 'no_accepted_offer' };
    }
    const { customerId, workerId } = row;
    // 2) Gönderen customer ise her zaman serbest
    if (from === customerId) return { allowed: true };
    // 3) Gönderen worker → customer en az 1 mesaj göndermiş olmalı.
    //    Phase 401 acceptance welcome bu şartı otomatik karşılar; ancak
    //    welcome insert fail olsa bile gate burada doğru çalışmaya devam eder.
    const ownerMessageCount = await this.messagesRepo.count({
      where: { from: customerId, to: workerId },
    });
    if (ownerMessageCount === 0) {
      return { allowed: false, reason: 'owner_must_initiate' };
    }
    return { allowed: true };
  }

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
  async sendMessage(from: string, dto: SendMessageDto): Promise<ChatMessage> {
    if (!from || !dto.to) {
      throw new BadRequestException('from ve to alanları gereklidir');
    }
    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('message boş olamaz');
    }

    // Phase 305 + 501 — Accepted-offer gate + owner-initiated rule.
    const gate = await this.canSend(from, dto.to);
    if (!gate.allowed) {
      throw new ForbiddenException(
        gate.reason === 'owner_must_initiate'
          ? 'Mesajlaşmayı sadece ilan sahibi başlatabilir. Lütfen ilan sahibinin ilk mesajını bekleyin.'
          : 'Mesajlaşma sadece teklifi kabul edilmiş kullanıcılar arasında açılır.',
      );
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

    // Phase 503 — HTTP send için de NotificationType.NEW_MESSAGE fan-out.
    // Mesaj genel bildirimler listesine düşer, bell badge artar, FCM/SMS gider.
    void this.fanOutMessageNotification({
      fromUserId: from,
      toUserId: dto.to,
      bodyPreview: dto.message.trim(),
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
    // Phase 365 — Tarihçeyi sadece accepted-offer çifti görür. Aksi
    // halde eski sohbet kayıtları offer kapandıktan sonra hala
    // okunabilir kalıyordu. `canChat` aktif teklif kontrolü yapar.
    if (!(await this.canChat(userId, peerId))) {
      throw new ForbiddenException(
        'Mesajlaşma sadece teklifi kabul edilmiş kullanıcılar arasında açılır.',
      );
    }
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
    // Phase 365 — accepted-offer çifti kuralı: liste yalnız ŞU AN
    // accepted offer'lı peer'leri gösterir. Eski sohbet kayıtları
    // mesajlaşmanın orijinal şartı (canChat) kaybolduğunda otomatik
    // gizlenir. sendMessage zaten canChat şartını uyguluyor; bu sadece
    // listeyi tutarlı tutar.
    const acceptedPeers = await this.getAcceptedPeers(userId);
    if (acceptedPeers.size === 0) return [];

    // Pull all messages involving this user, newest first.
    const rows = await this.messagesRepo
      .createQueryBuilder('m')
      .where('m.from = :uid OR m.to = :uid', { uid: userId })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    // Group by peer; first occurrence is the latest message because of DESC order.
    const peers = new Map<string, { last: ChatMessage; unread: number }>();
    for (const m of rows) {
      const peerId = m.from === userId ? m.to : m.from;
      if (!peerId) continue;
      // Phase 365 — accepted-offer çifti olmayan peer'leri DROP.
      if (!acceptedPeers.has(peerId)) continue;
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

    // Phase 305 — Accepted-offer chat gate: yalnız kabul edilmiş teklifi olan
    // çiftlerin konuşmaları listelenir. Eski/orfan konuşmalar gizlenir.
    const allowedPeers = await this.getAcceptedPeers(userId);
    return result.filter((r) => allowedPeers.has(r.peerId));
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
  async getUnreadCountByPeer(userId: string): Promise<Map<string, number>> {
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
