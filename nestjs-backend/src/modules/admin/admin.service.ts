import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Not,
  IsNull,
  Between,
  MoreThan,
  In,
  ILike,
  Raw,
  DataSource,
} from 'typeorm';
import {
  AdminListQueryDto,
  buildPaginated,
  normalizePaging,
  PaginatedResult,
} from './dto/admin-list-query.dto';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
// Phase 401 — Admin dashboard "Kullanılan krediler" toplamı için.
import {
  TokenTransaction,
  TxType,
} from '../tokens/token-transaction.entity';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { BulkFeatureDto, BulkUnfeatureDto } from './dto/bulk-feature.dto';
import { Job, JobStatus } from '../jobs/job.entity';
import { User, UserRole } from '../users/user.entity';
import {
  Notification,
  NotificationType,
} from '../notifications/notification.entity';
import {
  BroadcastNotificationDto,
  BroadcastSegment,
} from './dto/broadcast-notification.dto';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { Provider } from '../providers/provider.entity';
import { FcmService } from '../notifications/fcm.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  PromoService,
  CreatePromoDto,
  UpdatePromoDto,
} from '../promo/promo.service';

export interface FlaggedItem {
  type: 'chat' | 'question';
  id: string;
  text: string;
  flagReason: string | null;
  userId: string;
  createdAt: Date;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);
  private backupSchedulerHandle: NodeJS.Timeout | null = null;
  private static readonly BACKUP_RETENTION = 7;
  private static readonly BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
  constructor(
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(ServiceRequest)
    private srRepo: Repository<ServiceRequest>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(PaymentEscrow)
    private escrowRepo: Repository<PaymentEscrow>,
    @InjectRepository(ChatMessage) private chatRepo: Repository<ChatMessage>,
    @InjectRepository(JobQuestion)
    private questionRepo: Repository<JobQuestion>,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(AdminAuditLog)
    private auditRepo: Repository<AdminAuditLog>,
    @InjectRepository(Provider) private providersRepo: Repository<Provider>,
    @InjectRepository(TokenTransaction)
    private tokenTxRepo: Repository<TokenTransaction>,
    private readonly promoService: PromoService,
    private readonly fcmService: FcmService,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeService,
  ) {}

  async bulkVerifyUsers(
    dto: BulkVerifyDto,
    adminUserId: string,
  ): Promise<{
    updated: number;
    notFound: string[];
    skipped: string[];
    requestedSegment: 'verify' | 'unverify';
  }> {
    const { userIds, identityVerified } = dto;
    const found = await this.usersRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'emailVerified', 'isPhoneVerified'],
    });
    const foundSet = new Set(found.map((u) => u.id));
    const notFound = userIds.filter((id) => !foundSet.has(id));
    let presentIds = userIds.filter((id) => foundSet.has(id));

    // Phase 529 — Trust chain gating: identityVerified=true talebinde, email
    // veya telefon doğrulanmamış kullanıcılar bulk işlemden atlanır ve
    // skipped[] olarak rapor edilir.
    const skipped: string[] = [];
    if (identityVerified) {
      const eligible = found.filter(
        (u) => u.emailVerified || u.isPhoneVerified,
      );
      const eligibleSet = new Set(eligible.map((u) => u.id));
      presentIds = presentIds.filter((id) => {
        if (eligibleSet.has(id)) return true;
        skipped.push(id);
        return false;
      });
    }

    let updated = 0;
    if (presentIds.length > 0) {
      const result = await this.usersRepo
        .createQueryBuilder()
        .update(User)
        .set({ identityVerified })
        .whereInIds(presentIds)
        .execute();
      updated = result.affected ?? presentIds.length;

      const action = identityVerified ? 'user.verify' : 'user.unverify';
      const batchSize = presentIds.length;
      const auditEntries = presentIds.map((id) =>
        this.auditRepo.create({
          adminUserId,
          action,
          targetType: 'user',
          targetId: id,
          payload: { bulk: true, batchSize, identityVerified },
        }),
      );
      await this.auditRepo.save(auditEntries);
    }

    return {
      updated,
      notFound,
      skipped,
      requestedSegment: identityVerified ? 'verify' : 'unverify',
    };
  }

  async bulkFeatureWorkers(
    dto: BulkFeatureDto,
    adminUserId: string,
  ): Promise<{
    updated: number;
    notFound: string[];
    featuredOrder: 1 | 2 | 3 | null;
  }> {
    const { userIds, featuredOrder } = dto;
    const found = await this.usersRepo.find({
      where: { id: In(userIds) },
      select: ['id'],
    });
    const foundSet = new Set(found.map((u) => u.id));
    const notFound = userIds.filter((id) => !foundSet.has(id));
    const presentIds = userIds.filter((id) => foundSet.has(id));

    let updated = 0;
    if (presentIds.length > 0) {
      const result = await this.providersRepo
        .createQueryBuilder()
        .update(Provider)
        .set({ featuredOrder: featuredOrder })
        .where('userId IN (:...ids)', { ids: presentIds })
        .execute();
      updated = result.affected ?? 0;

      const batchSize = presentIds.length;
      const auditEntries = presentIds.map((id) =>
        this.auditRepo.create({
          adminUserId,
          action: 'user.bulk_feature',
          targetType: 'user',
          targetId: id,
          payload: { bulk: true, count: batchSize, featuredOrder },
        }),
      );
      await this.auditRepo.save(auditEntries);
    }

    return { updated, notFound, featuredOrder };
  }

  async bulkUnfeatureWorkers(
    dto: BulkUnfeatureDto,
    adminUserId: string,
  ): Promise<{ updated: number; notFound: string[] }> {
    const { userIds } = dto;
    const found = await this.usersRepo.find({
      where: { id: In(userIds) },
      select: ['id'],
    });
    const foundSet = new Set(found.map((u) => u.id));
    const notFound = userIds.filter((id) => !foundSet.has(id));
    const presentIds = userIds.filter((id) => foundSet.has(id));

    let updated = 0;
    if (presentIds.length > 0) {
      const result = await this.providersRepo
        .createQueryBuilder()
        .update(Provider)
        .set({ featuredOrder: null })
        .where('userId IN (:...ids)', { ids: presentIds })
        .execute();
      updated = result.affected ?? 0;

      const batchSize = presentIds.length;
      const auditEntries = presentIds.map((id) =>
        this.auditRepo.create({
          adminUserId,
          action: 'user.bulk_feature',
          targetType: 'user',
          targetId: id,
          payload: { bulk: true, count: batchSize, featuredOrder: null },
        }),
      );
      await this.auditRepo.save(auditEntries);
    }

    return { updated, notFound };
  }

  // ── Broadcast Notifications ───────────────────────────────────────────────

  /** Phase 208 — last 10 system broadcast records (title, body, createdAt, count per title). */
  async getBroadcastHistory(): Promise<
    { title: string; body: string; createdAt: Date; count: number }[]
  > {
    // Distinct broadcast events: group by title+body, pick earliest createdAt per group, limit 10
    const rows = await this.notificationRepo
      .createQueryBuilder('n')
      .select('n.title', 'title')
      .addSelect('n.body', 'body')
      .addSelect('MIN(n.createdAt)', 'createdAt')
      .addSelect('COUNT(n.id)', 'count')
      .where('n.type = :t', { t: 'system' })
      .groupBy('n.title')
      .addGroupBy('n.body')
      .orderBy('MIN(n.createdAt)', 'DESC')
      .limit(10)
      .getRawMany<{
        title: string;
        body: string;
        createdAt: Date;
        count: string;
      }>();
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  async broadcastNotification(
    dto: BroadcastNotificationDto,
  ): Promise<{ sent: number; segment: string }> {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .where('u.role = :role', { role: UserRole.USER });

    switch (dto.segment) {
      case BroadcastSegment.WORKERS:
        qb.andWhere(
          "u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'",
        );
        break;
      case BroadcastSegment.CUSTOMERS:
        qb.andWhere(
          "(u.workerCategories IS NULL OR u.workerCategories = '' OR u.workerCategories = '[]')",
        );
        break;
      case BroadcastSegment.VERIFIED_WORKERS:
        qb.andWhere(
          "u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'",
        );
        qb.andWhere('u.identityVerified = :v', { v: true });
        break;
      case BroadcastSegment.ALL:
      default:
        break;
    }

    const rows = await qb.getRawMany<{ id: string }>();
    if (rows.length === 0) {
      return { sent: 0, segment: dto.segment };
    }

    const entities = rows.map((r) =>
      this.notificationRepo.create({
        userId: r.id,
        type: NotificationType.SYSTEM,
        title: dto.title,
        body: dto.message,
        isRead: false,
      }),
    );

    // Bulk insert in chunks to avoid SQLite parameter limits
    const chunkSize = 500;
    for (let i = 0; i < entities.length; i += chunkSize) {
      await this.notificationRepo.save(entities.slice(i, i + chunkSize));
    }

    // Phase 171 — fan-out FCM push to segment users (fire-and-forget).
    // Collect all fcmTokens for these users (respecting pushNotificationsEnabled).
    void this.broadcastFcmPush(
      rows.map((r) => r.id),
      dto.title,
      dto.message,
    );

    return { sent: entities.length, segment: dto.segment };
  }

  /** Phase 171 — gather tokens for broadcast and multicast push (chunked). */
  private async broadcastFcmPush(
    userIds: string[],
    title: string,
    body: string,
  ): Promise<void> {
    if (!this.fcmService.isEnabled() || userIds.length === 0) return;
    try {
      const tokens: string[] = [];
      // Page through users to avoid huge IN() clauses on large segments.
      const pageSize = 1000;
      for (let i = 0; i < userIds.length; i += pageSize) {
        const page = userIds.slice(i, i + pageSize);
        const users = await this.usersRepo.find({
          where: { id: In(page) },
          select: ['id', 'fcmTokens', 'pushNotificationsEnabled'],
        });
        for (const u of users) {
          if (u.pushNotificationsEnabled === false) continue;
          if (Array.isArray(u.fcmTokens)) {
            for (const t of u.fcmTokens) {
              if (typeof t === 'string' && t.length > 0) tokens.push(t);
            }
          }
        }
      }
      if (tokens.length === 0) return;
      await this.fcmService.sendToTokens(tokens, title, body, {
        type: 'system',
        broadcast: '1',
      });
    } catch {
      // swallow — broadcast push must never block admin response
    }
  }

  // ── Moderation ────────────────────────────────────────────────────────────
  async getFlaggedItems(): Promise<FlaggedItem[]> {
    const [chats, questions] = await Promise.all([
      this.chatRepo.find({
        where: { flagged: true } as any,
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.questionRepo.find({
        where: { flagged: true } as any,
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    const items: FlaggedItem[] = [
      ...chats.map((c: any) => ({
        type: 'chat' as const,
        id: c.id,
        text: c.text ?? c.message ?? '',
        flagReason: c.flagReason ?? null,
        userId: c.senderId ?? c.userId ?? '',
        createdAt: c.createdAt,
      })),
      ...questions.map((q: any) => ({
        type: 'question' as const,
        id: q.id,
        text: q.text ?? '',
        flagReason: q.flagReason ?? null,
        userId: q.userId ?? '',
        createdAt: q.createdAt,
      })),
    ];

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return items;
  }

  async clearFlaggedChat(id: string) {
    await this.chatRepo.update(id, {
      text: '[silindi]',
      flagged: false,
    } as any);
    return { id, type: 'chat', cleared: true };
  }

  async clearFlaggedQuestion(id: string) {
    await this.questionRepo.update(id, {
      text: '[silindi]',
      flagged: false,
    });
    return { id, type: 'question', cleared: true };
  }

  // ── Phase 116: Moderation Queue ───────────────────────────────────────────
  async getModerationQueue(
    type: 'job' | 'review' | 'chat',
    page = 1,
    limit = 20,
  ): Promise<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const skip = (Math.max(1, page) - 1) * limit;
    if (type === 'job') {
      const [data, total] = await this.jobsRepo.findAndCount({
        where: { flagged: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    if (type === 'review') {
      const [data, total] = await this.reviewsRepo.findAndCount({
        where: { flagged: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    const [data, total] = await this.chatRepo.findAndCount({
      where: { flagged: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async moderateItem(
    type: 'job' | 'review' | 'chat',
    id: string,
    action: 'approve' | 'remove' | 'ban_user',
  ): Promise<{ id: string; type: string; action: string; ok: true }> {
    if (!['approve', 'remove', 'ban_user'].includes(action)) {
      throw new BadRequestException('Geçersiz işlem');
    }
    if (type === 'job') {
      const job = await this.jobsRepo.findOne({ where: { id } });
      if (!job) throw new NotFoundException('İlan bulunamadı');
      if (action === 'approve') {
        await this.jobsRepo.update(id, { flagged: false, flagReason: null });
      } else if (action === 'remove') {
        await this.jobsRepo.update(id, {
          deletedAt: new Date(),
          flagged: false,
        });
      } else {
        await this.usersRepo.update(job.customerId, {
          suspended: true,
          suspendedAt: new Date(),
          suspendedReason: 'Phase 116 fraud moderation',
        });
        await this.jobsRepo.update(id, {
          deletedAt: new Date(),
          flagged: false,
        });
      }
    } else if (type === 'review') {
      const review = await this.reviewsRepo.findOne({ where: { id } });
      if (!review) throw new NotFoundException('Yorum bulunamadı');
      if (action === 'approve') {
        await this.reviewsRepo.update(id, { flagged: false, flagReason: null });
      } else if (action === 'remove') {
        await this.reviewsRepo.update(id, {
          deletedAt: new Date(),
          flagged: false,
        });
      } else {
        await this.usersRepo.update(review.reviewerId, {
          suspended: true,
          suspendedAt: new Date(),
          suspendedReason: 'Phase 116 fraud moderation',
        });
        await this.reviewsRepo.update(id, {
          deletedAt: new Date(),
          flagged: false,
        });
      }
    } else {
      const chat = await this.chatRepo.findOne({ where: { id } });
      if (!chat) throw new NotFoundException('Mesaj bulunamadı');
      if (action === 'approve') {
        await this.chatRepo.update(id, { flagged: false });
      } else if (action === 'remove') {
        await this.chatRepo.update(id, {
          message: '[silindi]',
          flagged: false,
        });
      } else {
        const senderId = (chat as any).from;
        if (senderId)
          await this.usersRepo.update(senderId, {
            suspended: true,
            suspendedAt: new Date(),
            suspendedReason: 'Phase 116 fraud moderation',
          });
        await this.chatRepo.update(id, {
          message: '[silindi]',
          flagged: false,
        });
      }
    }
    return { id, type, action, ok: true };
  }

  // ── Promo Codes (delegates to PromoService) ───────────────────────────────
  listPromoCodes() {
    return this.promoService.findAll();
  }
  createPromoCode(dto: CreatePromoDto) {
    return this.promoService.create(dto);
  }
  updatePromoCode(id: string, dto: UpdatePromoDto) {
    return this.promoService.update(id, dto);
  }
  deletePromoCode(id: string) {
    return this.promoService.remove(id);
  }

  async getRevenue() {
    const baseSelect = (
      qb: ReturnType<typeof this.escrowRepo.createQueryBuilder>,
    ) =>
      qb
        .select('COALESCE(SUM(e.amount), 0)', 'totalGross')
        .addSelect('COALESCE(SUM(e.platformFeeAmount), 0)', 'totalPlatformFee')
        .addSelect('COALESCE(SUM(e.taskerNetAmount), 0)', 'totalTaskerNet')
        .addSelect('COUNT(*)', 'releasedCount')
        .where('e.status = :status', { status: EscrowStatus.RELEASED });

    const allRow = await baseSelect(
      this.escrowRepo.createQueryBuilder('e'),
    ).getRawOne();

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30Row = await baseSelect(this.escrowRepo.createQueryBuilder('e'))
      .andWhere('e.releasedAt >= :cutoff', { cutoff })
      .getRawOne();

    const toNum = (v: unknown) => Number(v ?? 0);
    return {
      totalGross: toNum(allRow?.totalGross),
      totalPlatformFee: toNum(allRow?.totalPlatformFee),
      totalTaskerNet: toNum(allRow?.totalTaskerNet),
      releasedCount: toNum(allRow?.releasedCount),
      last30Days: {
        totalGross: toNum(last30Row?.totalGross),
        totalPlatformFee: toNum(last30Row?.totalPlatformFee),
        totalTaskerNet: toNum(last30Row?.totalTaskerNet),
        releasedCount: toNum(last30Row?.releasedCount),
      },
    };
  }

  async getDashboardStats() {
    // Phase 175 — parallelize 11 stats + chartData in a single Promise.all wave.
    // Phase 268 — 4 new fields for Realtime Analytics page.
    const t0 = Date.now();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [
      totalJobs,
      totalUsers,
      totalServiceRequests,
      openServiceRequests,
      totalWorkers,
      verifiedWorkers,
      totalOffers,
      totalBookings,
      totalReviews,
      openJobs,
      completedJobs,
      chartData,
      signupsLast7d,
      jobsLast7d,
      activeWorkers7d,
      tokensSpent,
    ] = await Promise.all([
      this.jobsRepo.count(),
      this.usersRepo.count(),
      this.srRepo.count(),
      this.srRepo.count({ where: { status: 'open' } }),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.workerCategories IS NOT NULL')
        .andWhere("u.workerCategories != '[]'")
        .andWhere("u.workerCategories != ''")
        .getCount(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.identityVerified = :v', { v: true })
        .andWhere('u.workerCategories IS NOT NULL')
        .andWhere("u.workerCategories != '[]'")
        .getCount(),
      this.offersRepo.count(),
      this.bookingsRepo.count(),
      this.reviewsRepo.count(),
      this.jobsRepo.count({ where: { status: JobStatus.OPEN } }),
      this.jobsRepo.count({ where: { status: JobStatus.COMPLETED } }),
      this.getChartData(),
      this.usersRepo.count({ where: { createdAt: MoreThan(sevenDaysAgo) } }),
      this.jobsRepo.count({ where: { createdAt: MoreThan(sevenDaysAgo) } }),
      this.offersRepo
        .createQueryBuilder('o')
        .select('COUNT(DISTINCT o.userId)', 'cnt')
        .where('o.createdAt > :d', { d: sevenDaysAgo })
        .getRawOne<{ cnt: string }>()
        .then((r) => Number(r?.cnt ?? 0)),
      // Phase 401 — Kullanılan (silinen) krediler toplamı: tüm SPEND
      // transactionlarının amount SUM'ı. REFUND yok (Phase 401'de kaldırıldı).
      this.tokenTxRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.type = :type', { type: TxType.SPEND })
        .getRawOne<{ total: string | number }>()
        .then((r) => Number(r?.total ?? 0)),
    ]);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`getDashboardStats parallel ${Date.now() - t0}ms`);
    }

    return {
      totalJobs,
      openJobs,
      completedJobs,
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      // Aliases for admin panel compatibility
      totalProviders: totalWorkers,
      verifiedProviders: verifiedWorkers,
      totalServiceRequests,
      openServiceRequests,
      totalOffers,
      totalBookings,
      totalReviews,
      chartData,
      // Phase 268 — Realtime Analytics enrichment.
      usersOnlineNow: this.realtime.getOnlineCount(),
      signupsLast7d,
      jobsLast7d,
      activeWorkers7d,
      // Phase 401 — Toplam "Kullanılan krediler" (SPEND amount SUM).
      tokensSpent,
    };
  }

  // ── Phase 268 — Realtime Analytics ────────────────────────────────
  async getRealtimeOnline() {
    const ids = this.realtime.getOnlineUserIds();
    if (ids.length === 0) {
      return { count: 0, users: [], updatedAt: new Date().toISOString() };
    }
    const users = await this.usersRepo.find({
      where: { id: In(ids) },
      select: ['id', 'fullName'],
      take: 200,
    });
    return {
      count: ids.length,
      users,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Recent user "sessions" — sample of most-recently-seen users in the window.
   * Uses User.lastSeenAt (maintained by ChatGateway disconnect handler).
   * NOT a true session log; it's the cheapest proxy without a new table.
   */
  async getRealtimeSessions(days = 7) {
    const clamped = Math.max(1, Math.min(90, Math.floor(days) || 7));
    const since = new Date(Date.now() - clamped * 24 * 3600 * 1000);
    const users = await this.usersRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.fullName', 'u.lastSeenAt', 'u.isOnline'])
      .where('u.lastSeenAt > :since', { since })
      .orderBy('u.lastSeenAt', 'DESC')
      .take(50)
      .getMany();
    return {
      days: clamped,
      since: since.toISOString(),
      onlineNow: this.realtime.getOnlineCount(),
      users,
    };
  }

  async getChartData() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    // Phase 175 — fan out all 14 day-window counts in a single wave.
    const ranges = last7Days.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      return { date, nextDay, label: date.toLocaleDateString('tr-TR') };
    });

    const [jobCounts, userCounts] = await Promise.all([
      Promise.all(
        ranges.map(({ date, nextDay }) =>
          this.jobsRepo.count({ where: { createdAt: Between(date, nextDay) } }),
        ),
      ),
      Promise.all(
        ranges.map(({ date, nextDay }) =>
          this.usersRepo.count({
            where: { createdAt: Between(date, nextDay) },
          }),
        ),
      ),
    ]);

    const jobsPerDay = ranges.map((r, i) => ({
      date: r.label,
      count: jobCounts[i],
    }));
    const usersPerDay = ranges.map((r, i) => ({
      date: r.label,
      count: userCounts[i],
    }));

    return { jobsPerDay, usersPerDay };
  }

  async getRecentJobs(limit = 20) {
    return this.jobsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['customer'],
    });
  }

  /**
   * P191/4 — Paginated admin jobs list with optional search (title/category/location)
   * and status filter. Replaces full-array `getRecentJobs` for admin table view.
   */
  async getJobsPaged(q: AdminListQueryDto): Promise<PaginatedResult<Job>> {
    const { page, limit, skip, take } = normalizePaging(q);
    const search = q.search?.trim();
    const status = q.status?.trim();

    const where: Record<string, unknown>[] = [];
    if (search) {
      where.push({ title: ILike(`%${search}%`) });
      where.push({ category: ILike(`%${search}%`) });
      where.push({ location: ILike(`%${search}%`) });
    }
    let whereClause: unknown = where.length > 0 ? where : undefined;
    if (status) {
      // Merge status into each OR branch, or use single object.
      if (Array.isArray(whereClause)) {
        whereClause = (whereClause as Record<string, unknown>[]).map((w) => ({
          ...w,
          status,
        }));
      } else {
        whereClause = { status };
      }
    }

    const [items, total] = await this.jobsRepo.findAndCount({
      where: whereClause as never,
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: ['customer'],
    });
    return buildPaginated(items, total, page, limit);
  }

  async getAllUsers() {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'fullName',
        'email',
        'phoneNumber',
        'isPhoneVerified',
        'identityVerified',
        'role',
        'city',
        'latitude',
        'longitude',
        'workerCategories',
        'workerSkills',
        'badges',
        'manualBadges',
        'averageRating',
        'totalReviews',
        'asWorkerTotal',
        'asWorkerSuccess',
        'responseTimeMinutes',
        'tokenBalance',
        'createdAt',
      ],
    });
  }

  /**
   * P191/4 — Paginated admin users list with optional search (fullName/email/phone)
   * and status filter (`suspended` | `verified` | `unverified` | `worker` | `customer`).
   */
  async getUsersPaged(q: AdminListQueryDto): Promise<PaginatedResult<User>> {
    const { page, limit, skip, take } = normalizePaging(q);
    const search = q.search?.trim();
    const status = q.status?.trim();

    const baseFilter: Record<string, unknown> = {};
    if (status === 'suspended') baseFilter.suspended = true;
    else if (status === 'verified') baseFilter.identityVerified = true;
    else if (status === 'unverified') baseFilter.identityVerified = false;
    else if (status === 'worker' || status === 'customer' || status === 'admin')
      baseFilter.role = status;

    const orBranches: Record<string, unknown>[] = [];
    if (search) {
      orBranches.push({ ...baseFilter, fullName: ILike(`%${search}%`) });
      orBranches.push({ ...baseFilter, email: ILike(`%${search}%`) });
      orBranches.push({ ...baseFilter, phoneNumber: ILike(`%${search}%`) });
    }

    const where: unknown =
      orBranches.length > 0
        ? orBranches
        : Object.keys(baseFilter).length > 0
          ? baseFilter
          : undefined;

    const [items, total] = await this.usersRepo.findAndCount({
      where: where as never,
      order: { createdAt: 'DESC' },
      skip,
      take,
      select: [
        'id',
        'fullName',
        'email',
        'phoneNumber',
        'isPhoneVerified',
        'identityVerified',
        'role',
        'city',
        'latitude',
        'longitude',
        'workerCategories',
        'workerSkills',
        'badges',
        'manualBadges',
        'averageRating',
        'totalReviews',
        'asWorkerTotal',
        'asWorkerSuccess',
        'responseTimeMinutes',
        'suspended',
        'suspendedAt',
        'suspendedReason',
        'suspendedBy',
        'tokenBalance',
        'createdAt',
      ],
    });
    // Touch Raw import to keep tsc quiet if unused elsewhere
    void Raw;
    return buildPaginated(items, total, page, limit);
  }

  async getAllServiceRequests(limit = 50) {
    return this.srRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  async setServiceRequestFeaturedOrder(
    id: string,
    featuredOrder: number | null,
  ) {
    return this.srRepo.update(id, { featuredOrder });
  }

  async setJobFeaturedOrder(id: string, featuredOrder: number | null) {
    return this.jobsRepo.update(id, { featuredOrder });
  }

  // Phase 264 — tek bir user'ın featured slot'unu yaz.
  // Provider.featuredOrder yerine User.featuredOrder.
  async setFeaturedWorker(id: string, featuredOrder: number | null) {
    return this.usersRepo.update(id, { featuredOrder });
  }

  // Phase 265f — Admin hard-delete: kalıcı sil + manuel cascade. SQLite FK
  // CASCADE deploy'da garantili değil; transaction içinde tüm bağlı tabloları
  // tek tek temizler. admin_audit_logs tarihçesi KORUNUR.
  async hardDeleteUser(
    id: string,
  ): Promise<{
    deleted: boolean;
    id: string;
    affected: Record<string, number>;
  }> {
    const u = await this.usersRepo.findOne({ where: { id } });
    if (u?.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin hesabı silinemez');
    }
    // Idempotent: user satırı yoksa bile orphan dependent rows'u temizle.
    const affected: Record<string, number> = {};
    const phone = u?.phoneNumber ?? '';
    await this.dataSource.transaction(async (manager) => {
      await manager.query('PRAGMA foreign_keys = OFF');
      const ops: Array<[string, string, unknown[]]> = [
        ['availability_slots', 'DELETE FROM availability_slots WHERE userId = ?', [id]],
        ['availability_blackouts', 'DELETE FROM availability_blackouts WHERE userId = ?', [id]],
        ['booking_escrows', 'DELETE FROM booking_escrows WHERE customerId = ? OR workerId = ?', [id, id]],
        ['bookings', 'DELETE FROM bookings WHERE customerId = ? OR workerId = ?', [id, id]],
        ['email_verification_tokens', 'DELETE FROM email_verification_tokens WHERE userId = ?', [id]],
        ['favorite_providers', 'DELETE FROM favorite_providers WHERE userId = ? OR providerId = ?', [id, id]],
        ['favorite_workers', 'DELETE FROM favorite_workers WHERE userId = ? OR workerId = ?', [id, id]],
        ['job_questions', 'DELETE FROM job_questions WHERE userId = ?', [id]],
        ['job_question_replies', 'DELETE FROM job_question_replies WHERE userId = ?', [id]],
        ['notifications', 'DELETE FROM notifications WHERE userId = ?', [id]],
        ['offers', 'DELETE FROM offers WHERE userId = ?', [id]],
        ['password_reset_tokens', 'DELETE FROM password_reset_tokens WHERE userId = ?', [id]],
        ['payment_escrows', 'DELETE FROM payment_escrows WHERE customerId = ? OR taskerId = ?', [id, id]],
        ['providers', 'DELETE FROM providers WHERE userId = ?', [id]],
        ['reviews', 'DELETE FROM reviews WHERE reviewerId = ? OR revieweeId = ?', [id, id]],
        ['review_helpful', 'DELETE FROM review_helpful WHERE userId = ?', [id]],
        ['token_transactions', 'DELETE FROM token_transactions WHERE userId = ?', [id]],
        ['user_reports', 'DELETE FROM user_reports WHERE reporterUserId = ? OR reportedUserId = ?', [id, id]],
        ['user_subscriptions', 'DELETE FROM user_subscriptions WHERE userId = ?', [id]],
        ['user_blocks', 'DELETE FROM user_blocks WHERE blockerId = ? OR blockedId = ?', [id, id]],
        ['saved_jobs', 'DELETE FROM saved_jobs WHERE userId = ?', [id]],
        ['saved_job_searches', 'DELETE FROM saved_job_searches WHERE userId = ?', [id]],
        ['worker_boosts', 'DELETE FROM worker_boosts WHERE userId = ?', [id]],
        ['boosts', 'DELETE FROM boosts WHERE userId = ?', [id]],
        ['chat_messages', 'DELETE FROM chat_messages WHERE senderId = ? OR receiverId = ?', [id, id]],
        ['sms_otps', 'DELETE FROM sms_otps WHERE userId = ? OR phoneNumber = ?', [id, phone]],
        ['lead_requests', 'DELETE FROM lead_requests WHERE userId = ?', [id]],
        ['payments', 'DELETE FROM payments WHERE userId = ? OR customerId = ?', [id, id]],
        ['promo_redemptions', 'DELETE FROM promo_redemptions WHERE userId = ?', [id]],
        ['crypto_deposits', 'DELETE FROM crypto_deposits WHERE userId = ?', [id]],
        ['withdrawal_requests', 'DELETE FROM withdrawal_requests WHERE userId = ?', [id]],
        ['job_disputes', 'DELETE FROM job_disputes WHERE customerId = ? OR workerId = ? OR raisedByUserId = ?', [id, id, id]],
        ['disputes', 'DELETE FROM disputes WHERE raisedByUserId = ? OR againstUserId = ?', [id, id]],
        ['service_request_applications', 'DELETE FROM service_request_applications WHERE userId = ?', [id]],
        ['service_requests', 'DELETE FROM service_requests WHERE userId = ?', [id]],
        ['jobs', 'DELETE FROM jobs WHERE customerId = ? OR targetWorkerId = ?', [id, id]],
        ['category_subscriptions', 'DELETE FROM category_subscriptions WHERE userId = ?', [id]],
        ['users', 'DELETE FROM users WHERE id = ?', [id]],
      ];
      for (const [table, sql, params] of ops) {
        try {
          await manager.query(sql, params);
          const r = (await manager.query('SELECT changes() as c')) as Array<{
            c: number;
          }>;
          const c = r?.[0]?.c ?? 0;
          if (c > 0) affected[table] = c;
        } catch {
          // Tablo yoksa atla (entity yok veya migration eksik)
        }
      }
      await manager.query('PRAGMA foreign_keys = ON');
    });
    return { deleted: true, id, affected };
  }

  async verifyUser(id: string, identityVerified: boolean) {
    // Phase 529 — Trust chain gating: identityVerified=true ancak email VEYA
    // telefon doğrulanmışsa set edilebilir. Aksi halde 422 + Türkçe mesaj.
    if (identityVerified) {
      const user = await this.usersRepo.findOne({
        where: { id },
        select: ['id', 'emailVerified', 'isPhoneVerified'],
      });
      if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
      if (!user.emailVerified && !user.isPhoneVerified) {
        throw new UnprocessableEntityException(
          'Önce e-posta veya telefon doğrulanmalı',
        );
      }
    }
    return this.usersRepo.update(id, { identityVerified });
  }

  /**
   * Phase 47 — Admin user suspension/ban.
   * Self-suspend ve diğer adminleri suspend etme yasak.
   * Audit log AdminController'da yazılır.
   */
  async suspendUser(
    targetId: string,
    dto: SuspendUserDto,
    adminUserId: string,
  ) {
    if (targetId === adminUserId) {
      throw new BadRequestException('Kendi hesabınızı askıya alamazsınız');
    }
    const target = await this.usersRepo.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');
    if (target.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin hesabı askıya alınamaz');
    }
    const now = dto.suspended ? new Date() : null;
    await this.usersRepo.update(targetId, {
      suspended: dto.suspended,
      suspendedReason: dto.suspended ? (dto.reason ?? null) : null,
      suspendedAt: now,
      suspendedBy: dto.suspended ? adminUserId : null,
    });
    return {
      id: targetId,
      suspended: dto.suspended,
      suspendedReason: dto.suspended ? (dto.reason ?? null) : null,
      suspendedAt: now,
      suspendedBy: dto.suspended ? adminUserId : null,
    };
  }

  /**
   * Set Airtasker-style manual badges (insurance/premium/partner/verified_business).
   * Computed badges (top_rated, reliable, etc.) are derived at read-time and not stored.
   */
  async setUserBadges(id: string, badges: string[]) {
    const allowed = ['insurance', 'premium', 'partner', 'verified_business'];
    const filtered = (badges ?? []).filter((b) => allowed.includes(b));
    await this.usersRepo.update(id, { badges: filtered });
    return { id, badges: filtered };
  }

  /**
   * Set tasker skills (free-form granular tags). Trims, dedupes, drops empties,
   * caps to 20 to keep the JSON column small.
   */
  async setUserSkills(id: string, skills: string[]) {
    const cleaned = Array.from(
      new Set(
        (skills ?? [])
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter((s) => s.length > 0 && s.length <= 50),
      ),
    ).slice(0, 20);
    await this.usersRepo.update(id, { workerSkills: cleaned });
    return { id, workerSkills: cleaned };
  }

  // ── Phase 137 — Admin manual badge grant/revoke ─────────────────────
  private static readonly ADMIN_MANUAL_BADGE_KEYS = [
    'top_partner',
    'platform_pioneer',
    'community_hero',
    'vip',
  ];

  async grantManualBadge(userId: string, badgeKey: string) {
    if (!AdminService.ADMIN_MANUAL_BADGE_KEYS.includes(badgeKey)) {
      throw new BadRequestException('Geçersiz rozet anahtarı');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = user.manualBadges ?? [];
    const next = current.includes(badgeKey) ? current : [...current, badgeKey];
    await this.usersRepo.update(userId, { manualBadges: next });
    return { id: userId, manualBadges: next };
  }

  async revokeManualBadge(userId: string, badgeKey: string) {
    if (!AdminService.ADMIN_MANUAL_BADGE_KEYS.includes(badgeKey)) {
      throw new BadRequestException('Geçersiz rozet anahtarı');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const next = (user.manualBadges ?? []).filter((b) => b !== badgeKey);
    await this.usersRepo.update(userId, { manualBadges: next });
    return { id: userId, manualBadges: next };
  }

  // ── Phase 213 — Analytics Overview ────────────────────────────────────────
  async getAnalyticsOverview() {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const [
        dailyRegistrations,
        dailyJobs,
        revenueByDay,
        topCategories,
        workersByCity,
      ] = await Promise.all([
        // Son 30 gün günlük kullanıcı kaydı
        qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
          FROM users
          WHERE created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
        // Son 30 gün günlük ilan
        qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
          FROM jobs
          WHERE created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
        // Son 30 gün token satın alma (gelir)
        qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date,
                 SUM(amount) AS tokensPurchased
          FROM token_transactions
          WHERE type = 'purchase'
            AND created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
        // Top 5 kategori ilan sayısı
        qr.query(`
          SELECT category AS name, COUNT(*) AS jobCount
          FROM jobs
          WHERE category IS NOT NULL AND category != ''
          GROUP BY category
          ORDER BY jobCount DESC
          LIMIT 5
        `),
        // Şehre göre usta dağılımı (top 10)
        qr.query(`
          SELECT u.city AS city, COUNT(*) AS count
          FROM providers p
          JOIN users u ON u.id = p.userId
          WHERE u.city IS NOT NULL AND u.city != ''
          GROUP BY u.city
          ORDER BY count DESC
          LIMIT 10
        `),
      ]);

      return {
        dailyRegistrations: dailyRegistrations.map((r: any) => ({
          date: r.date,
          count: Number(r.count),
        })),
        dailyJobs: dailyJobs.map((r: any) => ({
          date: r.date,
          count: Number(r.count),
        })),
        revenueByDay: revenueByDay.map((r: any) => ({
          date: r.date,
          tokensPurchased: Number(r.tokensPurchased ?? 0),
        })),
        topCategories: topCategories.map((r: any) => ({
          name: r.name,
          jobCount: Number(r.jobCount),
        })),
        workersByCity: workersByCity.map((r: any) => ({
          city: r.city,
          count: Number(r.count),
        })),
      };
    } finally {
      await qr.release();
    }
  }

  // ── Harita Yönetimi — Koordinat güncelleme (Phase map-mgmt) ──────────────

  async setJobLocation(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<{ id: string }> {
    const job = await this.jobsRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    job.latitude = latitude;
    job.longitude = longitude;
    // geohash auto-recompute is handled by entity BeforeUpdate hook if present,
    // otherwise we just store raw coordinates for now.
    await this.jobsRepo.save(job);
    return { id };
  }

  async setUserLocation(
    id: string,
    latitude: number,
    longitude: number,
  ): Promise<{ id: string }> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.latitude = latitude;
    user.longitude = longitude;
    await this.usersRepo.save(user);
    return { id };
  }

  // ── Backup Manager ─────────────────────────────────────────────────────
  // SQLite DB dosyasını backups/ altına kopyalar. Restore endpoint YOK —
  // manuel SQLite replace gerekir (riskli).
  private static readonly BACKUP_FILENAME_RE = /^backup-[\d-]+\.sqlite$/;

  private getBackupDir(): string {
    const dir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getDbPath(): string {
    // app.module/data-source ile uyumlu çözümleme:
    //  1. Env mutlak yol verilmiş ve dosya varsa onu kullan
    //  2. Env göreceli ise process.cwd() ve cwd/../ (iisnode src/ cwd'sini ele al) altında ara
    //  3. Son çare: __dirname ve üst dizinlerinde 'hizmet_db.sqlite' ara
    const envName = process.env.DB_DATABASE || process.env.DB_PATH;
    const candidates: string[] = [];
    if (envName) {
      candidates.push(envName);
      candidates.push(path.join(process.cwd(), envName));
      candidates.push(path.join(process.cwd(), '..', envName));
    }
    candidates.push(path.join(process.cwd(), 'hizmet_db.sqlite'));
    candidates.push(path.join(process.cwd(), '..', 'hizmet_db.sqlite'));
    candidates.push(path.join(__dirname, '..', '..', 'hizmet_db.sqlite'));
    candidates.push(path.join(__dirname, '..', '..', '..', 'hizmet_db.sqlite'));
    for (const p of candidates) {
      try {
        if (p && fs.existsSync(p)) return p;
      } catch { /* skip */ }
    }
    return path.join(process.cwd(), 'hizmet_db.sqlite');
  }

  private sanitizeBackupName(name: string): string {
    const base = path.basename(name);
    if (!AdminService.BACKUP_FILENAME_RE.test(base)) {
      throw new BadRequestException('Geçersiz yedek adı');
    }
    return base;
  }

  onModuleInit() {
    // İlk açılışta hemen 1 backup al (5sn sonra, app fully ready)
    setTimeout(() => {
      this.createBackup().catch((e: Error) =>
        this.logger.error(`Initial backup fail: ${e.message}`),
      );
    }, 5000);
    // Her 24 saatte bir create + retention prune
    this.backupSchedulerHandle = setInterval(() => {
      void this.runScheduledBackup();
    }, AdminService.BACKUP_INTERVAL_MS);
  }

  private async runScheduledBackup(): Promise<void> {
    try {
      await this.createBackup();
      const all = await this.listBackups();
      const sorted = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const toDelete = sorted.slice(AdminService.BACKUP_RETENTION);
      for (const old of toDelete) {
        try {
          await this.deleteBackup(old.filename);
        } catch {
          // skip
        }
      }
      this.logger.log(
        `Scheduled backup OK — kept ${sorted.length - toDelete.length}, pruned ${toDelete.length}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Scheduled backup fail: ${msg}`);
    }
  }

  async restoreBackup(
    filename: string,
    confirmToken: string,
    adminUserId: string,
  ): Promise<{
    ok: boolean;
    restoredFrom: string;
    preRestoreSnapshot: string | null;
    note: string;
  }> {
    // 1. Token kontrol — bugünün tarihi YYYYMMDD
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayToken = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    if (confirmToken !== todayToken) {
      throw new BadRequestException(
        'Geçersiz onay token (bugünün tarihi YYYYMMDD)',
      );
    }
    // 2. Backup dosyasını bul (sanitize + exists)
    const safe = this.sanitizeBackupName(filename);
    const dir = this.getBackupDir();
    const backupPath = path.join(dir, safe);
    if (!fs.existsSync(backupPath)) {
      throw new NotFoundException('Backup bulunamadı');
    }
    // 3. PRE-RESTORE snapshot (mevcut DB'yi koru)
    const dbPath = this.getDbPath();
    let preName: string | null = null;
    if (fs.existsSync(dbPath)) {
      const stamp =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      preName = `backup-prerestore-${stamp}.sqlite`;
      // BACKUP_FILENAME_RE pattern'i prerestore'u kabul etmiyor — listBackups
      // ana yedekleri ayırt edebilsin diye ayrı dosya adı tutuyoruz.
      try {
        fs.copyFileSync(dbPath, path.join(dir, preName));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Pre-restore snapshot fail: ${msg}`);
        preName = null;
      }
    }
    // 4. Restore: backup → current DB
    fs.copyFileSync(backupPath, dbPath);
    // 5. Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        adminUserId,
        action: 'backup.restore',
        targetType: 'backup',
        targetId: safe,
        payload: { restoredFrom: safe, preRestoreSnapshot: preName },
      }),
    );
    this.logger.warn(
      `[BACKUP RESTORE] adminId=${adminUserId} from=${safe} pre=${preName ?? '-'}`,
    );
    return {
      ok: true,
      restoredFrom: safe,
      preRestoreSnapshot: preName,
      note: 'Backend restart edilmeli — config/cache yeniden yüklenecek',
    };
  }

  async createBackup(): Promise<{
    filename: string;
    size: number;
    path: string;
    createdAt: string;
  }> {
    const dbPath = this.getDbPath();
    if (!fs.existsSync(dbPath)) {
      throw new NotFoundException('Veritabanı dosyası bulunamadı');
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `backup-${stamp}.sqlite`;
    const dir = this.getBackupDir();
    const dest = path.join(dir, filename);
    fs.copyFileSync(dbPath, dest);
    const stat = fs.statSync(dest);
    return {
      filename,
      size: stat.size,
      path: dest,
      createdAt: stat.mtime.toISOString(),
    };
  }

  async listBackups(): Promise<
    Array<{ filename: string; size: number; createdAt: string }>
  > {
    const dir = this.getBackupDir();
    const entries = fs.readdirSync(dir);
    const rows: Array<{ filename: string; size: number; createdAt: string }> =
      [];
    for (const name of entries) {
      if (!AdminService.BACKUP_FILENAME_RE.test(name)) continue;
      try {
        const stat = fs.statSync(path.join(dir, name));
        if (!stat.isFile()) continue;
        rows.push({
          filename: name,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        });
      } catch {
        // tek dosya bozuksa atla
      }
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows;
  }

  resolveBackupPath(filename: string): string {
    const safe = this.sanitizeBackupName(filename);
    const dir = this.getBackupDir();
    const full = path.join(dir, safe);
    if (!fs.existsSync(full)) {
      throw new NotFoundException('Yedek bulunamadı');
    }
    return full;
  }

  async deleteBackup(filename: string): Promise<{ deleted: true }> {
    const full = this.resolveBackupPath(filename);
    fs.unlinkSync(full);
    return { deleted: true };
  }
}
