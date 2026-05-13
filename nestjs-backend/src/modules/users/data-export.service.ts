import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Booking } from '../bookings/booking.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { Review } from '../reviews/review.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { Notification } from '../notifications/notification.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';

/**
 * Phase 183 — KVKK / GDPR user data export.
 *
 * Gathers everything stored about the authenticated user into a single JSON
 * document. Sensitive fields (passwordHash, twoFactorSecret, fcm tokens) are
 * redacted. Chat messages from other users are masked.
 */
const SENSITIVE_USER_KEYS = new Set([
  'passwordHash',
  'twoFactorSecret',
  'calendarToken',
]);

const CHAT_LIMIT = 1000;
const NOTIFICATION_LIMIT = 500;

@Injectable()
export class DataExportService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentEscrow)
    private readonly escrows: Repository<PaymentEscrow>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(ChatMessage)
    private readonly chats: Repository<ChatMessage>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(JobLead) private readonly jobLeads: Repository<JobLead>,
    @InjectRepository(JobLeadResponse)
    private readonly leadResponses: Repository<JobLeadResponse>,
  ) {}

  private sanitizeUser(user: User | null): Record<string, unknown> | null {
    if (!user) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(user)) {
      if (SENSITIVE_USER_KEYS.has(k)) continue;
      if (k === 'fcmTokens') continue; // listed separately, masked
      out[k] = v;
    }
    return out;
  }

  async exportForUser(userId: string): Promise<object> {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const user = await this.users.findOne({ where: { id: userId } });
    const profile = this.sanitizeUser(user);

    // Bookings: as customer or as worker, last 5 years.
    const bookingsRaw = await this.bookings
      .createQueryBuilder('b')
      .where('(b.customerId = :uid OR b.workerId = :uid)', { uid: userId })
      .andWhere('b.createdAt >= :since', { since: fiveYearsAgo })
      .orderBy('b.createdAt', 'DESC')
      .getMany();
    const bookingIds = bookingsRaw.map((b) => b.id);

    // Escrows: linked through customerId/taskerId (escrow has no bookingId).
    const escrows = await this.escrows.find({
      where: [{ customerId: userId }, { taskerId: userId }],
      order: { createdAt: 'DESC' },
    });

    // Payments where the user is customer or worker.
    const payments = await this.payments.find({
      where: [{ customerId: userId }, { workerId: userId }],
      order: { createdAt: 'DESC' },
    });

    // Job leads created by user (as customer).
    const jobLeads = await this.jobLeads.find({
      where: { customerId: userId },
      order: { createdAt: 'DESC' },
    });

    // Lead responses made by user (as worker).
    const jobLeadResponses = await this.leadResponses.find({
      where: { workerId: userId },
      order: { createdAt: 'DESC' },
    });

    // Reviews authored + received.
    const reviewsAuthored = await this.reviews.find({
      where: { reviewerId: userId },
      order: { createdAt: 'DESC' },
    });
    const reviewsReceived = await this.reviews.find({
      where: { revieweeId: userId },
      order: { createdAt: 'DESC' },
    });

    // Chat messages: sender or receiver — last N.
    const chatRows = await this.chats.find({
      where: [{ from: userId }, { to: userId }],
      order: { createdAt: 'DESC' },
      take: CHAT_LIMIT + 1,
    });
    const chatTruncated = chatRows.length > CHAT_LIMIT;
    const chatMessages = chatRows.slice(0, CHAT_LIMIT).map((m) => ({
      id: m.id,
      jobId: m.jobId,
      jobLeadId: m.jobLeadId,
      message: m.message,
      createdAt: m.createdAt,
      direction: m.from === userId ? 'sent' : 'received',
      // mask the other party — only requester's identity is visible
      counterparty: m.from === userId ? 'Other user' : 'Other user',
      isOwnMessage: m.from === userId,
    }));

    // Notifications — last N.
    const notifRows = await this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: NOTIFICATION_LIMIT + 1,
    });
    const notifTruncated = notifRows.length > NOTIFICATION_LIMIT;
    const notifications = notifRows.slice(0, NOTIFICATION_LIMIT);

    // fcm tokens — present but redacted (KVKK: user has right to know we hold them).
    const fcmTokens =
      Array.isArray(user?.fcmTokens) && user!.fcmTokens!.length
        ? user!.fcmTokens!.map(() => '[REDACTED]')
        : [];

    const fields = {
      profile,
      bookings: bookingsRaw,
      escrows,
      payments,
      jobLeads,
      jobLeadResponses,
      reviews: {
        authored: reviewsAuthored,
        received: reviewsReceived,
      },
      fcmTokens,
      chatMessages,
      notifications,
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      fields,
      meta: {
        counts: {
          bookings: bookingsRaw.length,
          escrows: escrows.length,
          payments: payments.length,
          jobLeads: jobLeads.length,
          jobLeadResponses: jobLeadResponses.length,
          reviewsAuthored: reviewsAuthored.length,
          reviewsReceived: reviewsReceived.length,
          fcmTokens: fcmTokens.length,
          chatMessages: chatMessages.length,
          notifications: notifications.length,
          bookingIdsTracked: bookingIds.length,
        },
        truncated: {
          chatMessages: chatTruncated,
          notifications: notifTruncated,
        },
        limits: {
          chatMessages: CHAT_LIMIT,
          notifications: NOTIFICATION_LIMIT,
          bookingsSinceYears: 5,
        },
        redactionNotice:
          'Authentication credentials, 2FA secrets, calendar tokens, and FCM device tokens are stripped. Chat counterparties are masked to "Other user".',
      },
    };
  }
}
