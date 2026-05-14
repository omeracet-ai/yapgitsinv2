import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Between, MoreThan, In, ILike, Raw, DataSource } from 'typeorm';
import {
  AdminListQueryDto,
  buildPaginated,
  normalizePaging,
  PaginatedResult,
} from './dto/admin-list-query.dto';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { BulkFeatureDto, BulkUnfeatureDto } from './dto/bulk-feature.dto';
import { Job, JobStatus } from '../jobs/job.entity';
import { User, UserRole } from '../users/user.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';
import { BroadcastNotificationDto, BroadcastSegment } from './dto/broadcast-notification.dto';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { Provider } from '../providers/provider.entity';
import { FcmService } from '../notifications/fcm.service';
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
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(Job) private jobsRepo: Repository<Job>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(ServiceRequest)
    private srRepo: Repository<ServiceRequest>,
    @InjectRepository(Offer) private offersRepo: Repository<Offer>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(PaymentEscrow) private escrowRepo: Repository<PaymentEscrow>,
    @InjectRepository(ChatMessage) private chatRepo: Repository<ChatMessage>,
    @InjectRepository(JobQuestion) private questionRepo: Repository<JobQuestion>,
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
    @InjectRepository(AdminAuditLog) private auditRepo: Repository<AdminAuditLog>,
    @InjectRepository(Provider) private providersRepo: Repository<Provider>,
    private readonly promoService: PromoService,
    private readonly fcmService: FcmService,
    private readonly dataSource: DataSource,
  ) {}

  async bulkVerifyUsers(
    dto: BulkVerifyDto,
    adminUserId: string,
  ): Promise<{ updated: number; notFound: string[]; requestedSegment: 'verify' | 'unverify' }> {
    const { userIds, identityVerified } = dto;
    const found = await this.usersRepo.find({
      where: { id: In(userIds) },
      select: ['id'],
    });
    const foundSet = new Set(found.map((u) => u.id));
    const notFound = userIds.filter((id) => !foundSet.has(id));
    const presentIds = userIds.filter((id) => foundSet.has(id));

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
      requestedSegment: identityVerified ? 'verify' : 'unverify',
    };
  }

  async bulkFeatureWorkers(
    dto: BulkFeatureDto,
    adminUserId: string,
  ): Promise<{ updated: number; notFound: string[]; featuredOrder: 1 | 2 | 3 | null }> {
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
        .set({ featuredOrder: featuredOrder as number | null })
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
      .getRawMany<{ title: string; body: string; createdAt: Date; count: string }>();
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
        qb.andWhere("u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'");
        break;
      case BroadcastSegment.CUSTOMERS:
        qb.andWhere("(u.workerCategories IS NULL OR u.workerCategories = '' OR u.workerCategories = '[]')");
        break;
      case BroadcastSegment.VERIFIED_WORKERS:
        qb.andWhere("u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'");
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
    void this.broadcastFcmPush(rows.map((r) => r.id), dto.title, dto.message);

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

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }

  async clearFlaggedChat(id: string) {
    await this.chatRepo.update(id, { text: '[silindi]', flagged: false } as any);
    return { id, type: 'chat', cleared: true };
  }

  async clearFlaggedQuestion(id: string) {
    await this.questionRepo.update(id, { text: '[silindi]', flagged: false } as any);
    return { id, type: 'question', cleared: true };
  }

  // ── Phase 116: Moderation Queue ───────────────────────────────────────────
  async getModerationQueue(
    type: 'job' | 'review' | 'chat',
    page = 1,
    limit = 20,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number; pages: number }> {
    const skip = (Math.max(1, page) - 1) * limit;
    if (type === 'job') {
      const [data, total] = await this.jobsRepo.findAndCount({
        where: { flagged: true } as any,
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    if (type === 'review') {
      const [data, total] = await this.reviewsRepo.findAndCount({
        where: { flagged: true } as any,
        order: { createdAt: 'DESC' },
        take: limit,
        skip,
      });
      return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    const [data, total] = await this.chatRepo.findAndCount({
      where: { flagged: true } as any,
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
        await this.jobsRepo.update(id, { deletedAt: new Date(), flagged: false });
      } else {
        await this.usersRepo.update(job.customerId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' } as any);
        await this.jobsRepo.update(id, { deletedAt: new Date(), flagged: false });
      }
    } else if (type === 'review') {
      const review = await this.reviewsRepo.findOne({ where: { id } });
      if (!review) throw new NotFoundException('Yorum bulunamadı');
      if (action === 'approve') {
        await this.reviewsRepo.update(id, { flagged: false, flagReason: null });
      } else if (action === 'remove') {
        await this.reviewsRepo.update(id, { deletedAt: new Date(), flagged: false });
      } else {
        await this.usersRepo.update(review.reviewerId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' } as any);
        await this.reviewsRepo.update(id, { deletedAt: new Date(), flagged: false });
      }
    } else {
      const chat = await this.chatRepo.findOne({ where: { id } });
      if (!chat) throw new NotFoundException('Mesaj bulunamadı');
      if (action === 'approve') {
        await this.chatRepo.update(id, { flagged: false } as any);
      } else if (action === 'remove') {
        await this.chatRepo.update(id, { message: '[silindi]', flagged: false } as any);
      } else {
        const senderId = (chat as any).from;
        if (senderId) await this.usersRepo.update(senderId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' } as any);
        await this.chatRepo.update(id, { message: '[silindi]', flagged: false } as any);
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
    const baseSelect = (qb: ReturnType<typeof this.escrowRepo.createQueryBuilder>) =>
      qb
        .select('COALESCE(SUM(e.amount), 0)', 'totalGross')
        .addSelect('COALESCE(SUM(e.platformFeeAmount), 0)', 'totalPlatformFee')
        .addSelect('COALESCE(SUM(e.taskerNetAmount), 0)', 'totalTaskerNet')
        .addSelect('COUNT(*)', 'releasedCount')
        .where('e.status = :status', { status: EscrowStatus.RELEASED });

    const allRow = await baseSelect(this.escrowRepo.createQueryBuilder('e')).getRawOne();

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
    const t0 = Date.now();
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
          this.usersRepo.count({ where: { createdAt: Between(date, nextDay) } }),
        ),
      ),
    ]);

    const jobsPerDay = ranges.map((r, i) => ({ date: r.label, count: jobCounts[i] }));
    const usersPerDay = ranges.map((r, i) => ({ date: r.label, count: userCounts[i] }));

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
    let whereClause: unknown =
      where.length > 0 ? where : undefined;
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
        'workerCategories',
        'workerSkills',
        'badges',
        'manualBadges',
        'averageRating',
        'totalReviews',
        'asWorkerTotal',
        'asWorkerSuccess',
        'responseTimeMinutes',
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
      baseFilter.role = status as UserRole;

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

  async verifyUser(id: string, identityVerified: boolean) {
    return this.usersRepo.update(id, { identityVerified });
  }

  /**
   * Phase 47 — Admin user suspension/ban.
   * Self-suspend ve diğer adminleri suspend etme yasak.
   * Audit log AdminController'da yazılır.
   */
  async suspendUser(targetId: string, dto: SuspendUserDto, adminUserId: string) {
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
        dailyRegistrations: dailyRegistrations.map((r: any) => ({ date: r.date, count: Number(r.count) })),
        dailyJobs: dailyJobs.map((r: any) => ({ date: r.date, count: Number(r.count) })),
        revenueByDay: revenueByDay.map((r: any) => ({ date: r.date, tokensPurchased: Number(r.tokensPurchased ?? 0) })),
        topCategories: topCategories.map((r: any) => ({ name: r.name, jobCount: Number(r.jobCount) })),
        workersByCity: workersByCity.map((r: any) => ({ city: r.city, count: Number(r.count) })),
      };
    } finally {
      await qr.release();
    }
  }
}
