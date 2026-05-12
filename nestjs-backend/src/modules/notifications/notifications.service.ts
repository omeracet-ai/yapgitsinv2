import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { FcmService } from './fcm.service';
import { EmailService } from '../email/email.service';

export type NotificationCategory =
  | 'booking'
  | 'offer'
  | 'review'
  | 'message'
  | 'system';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly fcm: FcmService,
    private readonly email: EmailService,
  ) {}

  /** Phase 121 — fire-and-forget email for selected notification types */
  private async sendEmailForNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
  ): Promise<void> {
    const emailTypes: NotificationType[] = [
      NotificationType.BOOKING_CONFIRMED,
      NotificationType.OFFER_ACCEPTED,
      NotificationType.OFFER_REJECTED,
    ];
    if (!emailTypes.includes(type)) return;
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'fullName', 'notificationPreferences'],
    });
    if (!user || !user.email) return;
    // Phase 49 — respect category prefs (already checked by send(), but guard again)
    const cat = NotificationsService.categoryFor(type);
    if (
      user.notificationPreferences &&
      user.notificationPreferences[cat] === false
    ) {
      return;
    }
    const html = `<!doctype html><body style="font-family:Arial,sans-serif;color:#2D3E50">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <div style="background:#007DFE;padding:20px 24px;color:#fff">
          <div style="font-size:22px;font-weight:bold">Yapgitsin</div>
          <div style="font-size:14px">${title}</div>
        </div>
        <div style="padding:24px">
          <p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
          <p>${body}</p>
          <p style="margin-top:24px"><a href="https://yapgitsin.tr" style="background:#007DFE;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Uygulamayı Aç</a></p>
        </div>
        <div style="padding:16px 24px;background:#F8F9FA;color:#6b7280;font-size:12px">
          destek@yapgitsin.tr · <a href="https://yapgitsin.tr/unsubscribe" style="color:#007DFE">Abonelikten çık</a>
        </div>
      </div></body>`;
    void this.email.send(user.email, `${title} — Yapgitsin`, html);
  }

  /** Phase 49 — map notification type to a high-level preference category */
  static categoryFor(type: NotificationType): NotificationCategory {
    switch (type) {
      case NotificationType.BOOKING_REQUEST:
      case NotificationType.BOOKING_CONFIRMED:
      case NotificationType.BOOKING_CANCELLED:
      case NotificationType.BOOKING_COMPLETED:
        return 'booking';
      case NotificationType.NEW_OFFER:
      case NotificationType.OFFER_ACCEPTED:
      case NotificationType.OFFER_REJECTED:
      case NotificationType.COUNTER_OFFER:
      case NotificationType.OFFER_EXPIRED:
        return 'offer';
      case NotificationType.NEW_REVIEW:
      case NotificationType.REVIEW_REMINDER:
        return 'review';
      default:
        return 'system';
    }
  }

  /** Phase 49 — check user prefs; null prefs = all enabled */
  private async shouldSendNotification(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'notificationPreferences'],
    });
    if (!user || !user.notificationPreferences) return true;
    const cat = NotificationsService.categoryFor(type);
    return user.notificationPreferences[cat] !== false;
  }

  /** Phase 71 — derive deep-link target type from notification type */
  static relatedTypeFor(type: NotificationType): 'booking' | 'job' | 'user' | null {
    switch (type) {
      case NotificationType.BOOKING_REQUEST:
      case NotificationType.BOOKING_CONFIRMED:
      case NotificationType.BOOKING_CANCELLED:
      case NotificationType.BOOKING_COMPLETED:
        return 'booking';
      case NotificationType.NEW_OFFER:
      case NotificationType.OFFER_ACCEPTED:
      case NotificationType.OFFER_REJECTED:
      case NotificationType.COUNTER_OFFER:
      case NotificationType.OFFER_EXPIRED:
      case NotificationType.JOB_PENDING_COMPLETION:
      case NotificationType.JOB_COMPLETED:
      case NotificationType.JOB_CANCELLED:
      case NotificationType.DISPUTE_OPENED:
      case NotificationType.DISPUTE_RESOLVED:
      case NotificationType.SAVED_SEARCH_MATCH:
        return 'job';
      case NotificationType.NEW_REVIEW:
      case NotificationType.REVIEW_REMINDER:
        return 'user';
      default:
        return null; // SYSTEM ve diğerleri — no-op tap
    }
  }

  async send(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    refId?: string;
    /** Phase 71 — override deep-link target type (auto-derived if absent) */
    relatedType?: 'booking' | 'job' | 'user' | null;
    /** Phase 71 — override deep-link target id (defaults to refId) */
    relatedId?: string | null;
  }): Promise<Notification | null> {
    // Phase 49 — silently skip if user opted out of this category
    const allowed = await this.shouldSendNotification(data.userId, data.type);
    if (!allowed) return null;
    const relatedType =
      data.relatedType !== undefined
        ? data.relatedType
        : NotificationsService.relatedTypeFor(data.type);
    const relatedId =
      data.relatedId !== undefined ? data.relatedId : data.refId ?? null;
    const n = this.repo.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      refId: data.refId ?? null,
      relatedType,
      relatedId,
      isRead: false,
    });
    const saved = await this.repo.save(n);
    // Phase 121 — fire-and-forget transactional email (selected types)
    void this.sendEmailForNotification(data.userId, data.type, data.title, data.body);
    // Phase 113 — fire-and-forget FCM push (does not block API response)
    void this.fcm.sendToUser(data.userId, data.title, data.body, {
      type: String(data.type),
      ...(data.refId ? { refId: data.refId } : {}),
      ...(relatedType ? { relatedType } : {}),
      ...(relatedId ? { relatedId } : {}),
    });
    return saved;
  }

  getByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  /** Phase 164 — update user push notification settings (token and/or enabled state) */
  async updateUserPushSettings(
    userId: string,
    settings: {
      fcmToken?: string | null;
      pushNotificationsEnabled?: boolean;
    },
  ): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const updates: Record<string, unknown> = {};

    // Phase 164 — add or remove FCM token
    if (settings.fcmToken !== undefined) {
      if (settings.fcmToken) {
        // Add token to list (avoid duplicates)
        const tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
        if (!tokens.includes(settings.fcmToken)) {
          tokens.push(settings.fcmToken);
        }
        updates.fcmTokens = tokens;
      } else {
        // Remove token (null means user cleared it)
        updates.fcmTokens = null;
      }
    }

    // Phase 164 — enable/disable push notifications globally
    if (settings.pushNotificationsEnabled !== undefined) {
      updates.pushNotificationsEnabled = settings.pushNotificationsEnabled;
    }

    if (Object.keys(updates).length > 0) {
      await this.usersRepo.update(userId, updates);
    }
  }
}
