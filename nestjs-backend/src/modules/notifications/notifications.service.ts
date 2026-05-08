import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { FcmService } from './fcm.service';

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
  ) {}

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
}
