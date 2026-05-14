"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_list_query_dto_1 = require("./dto/admin-list-query.dto");
const admin_audit_log_entity_1 = require("../admin-audit/admin-audit-log.entity");
const job_entity_1 = require("../jobs/job.entity");
const user_entity_1 = require("../users/user.entity");
const notification_entity_1 = require("../notifications/notification.entity");
const broadcast_notification_dto_1 = require("./dto/broadcast-notification.dto");
const service_request_entity_1 = require("../service-requests/service-request.entity");
const offer_entity_1 = require("../jobs/offer.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const review_entity_1 = require("../reviews/review.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const chat_message_entity_1 = require("../chat/chat-message.entity");
const job_question_entity_1 = require("../jobs/job-question.entity");
const provider_entity_1 = require("../providers/provider.entity");
const fcm_service_1 = require("../notifications/fcm.service");
const promo_service_1 = require("../promo/promo.service");
let AdminService = class AdminService {
    static { AdminService_1 = this; }
    jobsRepo;
    usersRepo;
    srRepo;
    offersRepo;
    bookingsRepo;
    reviewsRepo;
    escrowRepo;
    chatRepo;
    questionRepo;
    notificationRepo;
    auditRepo;
    providersRepo;
    promoService;
    fcmService;
    dataSource;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(jobsRepo, usersRepo, srRepo, offersRepo, bookingsRepo, reviewsRepo, escrowRepo, chatRepo, questionRepo, notificationRepo, auditRepo, providersRepo, promoService, fcmService, dataSource) {
        this.jobsRepo = jobsRepo;
        this.usersRepo = usersRepo;
        this.srRepo = srRepo;
        this.offersRepo = offersRepo;
        this.bookingsRepo = bookingsRepo;
        this.reviewsRepo = reviewsRepo;
        this.escrowRepo = escrowRepo;
        this.chatRepo = chatRepo;
        this.questionRepo = questionRepo;
        this.notificationRepo = notificationRepo;
        this.auditRepo = auditRepo;
        this.providersRepo = providersRepo;
        this.promoService = promoService;
        this.fcmService = fcmService;
        this.dataSource = dataSource;
    }
    async bulkVerifyUsers(dto, adminUserId) {
        const { userIds, identityVerified } = dto;
        const found = await this.usersRepo.find({
            where: { id: (0, typeorm_2.In)(userIds) },
            select: ['id'],
        });
        const foundSet = new Set(found.map((u) => u.id));
        const notFound = userIds.filter((id) => !foundSet.has(id));
        const presentIds = userIds.filter((id) => foundSet.has(id));
        let updated = 0;
        if (presentIds.length > 0) {
            const result = await this.usersRepo
                .createQueryBuilder()
                .update(user_entity_1.User)
                .set({ identityVerified })
                .whereInIds(presentIds)
                .execute();
            updated = result.affected ?? presentIds.length;
            const action = identityVerified ? 'user.verify' : 'user.unverify';
            const batchSize = presentIds.length;
            const auditEntries = presentIds.map((id) => this.auditRepo.create({
                adminUserId,
                action,
                targetType: 'user',
                targetId: id,
                payload: { bulk: true, batchSize, identityVerified },
            }));
            await this.auditRepo.save(auditEntries);
        }
        return {
            updated,
            notFound,
            requestedSegment: identityVerified ? 'verify' : 'unverify',
        };
    }
    async bulkFeatureWorkers(dto, adminUserId) {
        const { userIds, featuredOrder } = dto;
        const found = await this.usersRepo.find({
            where: { id: (0, typeorm_2.In)(userIds) },
            select: ['id'],
        });
        const foundSet = new Set(found.map((u) => u.id));
        const notFound = userIds.filter((id) => !foundSet.has(id));
        const presentIds = userIds.filter((id) => foundSet.has(id));
        let updated = 0;
        if (presentIds.length > 0) {
            const result = await this.providersRepo
                .createQueryBuilder()
                .update(provider_entity_1.Provider)
                .set({ featuredOrder: featuredOrder })
                .where('userId IN (:...ids)', { ids: presentIds })
                .execute();
            updated = result.affected ?? 0;
            const batchSize = presentIds.length;
            const auditEntries = presentIds.map((id) => this.auditRepo.create({
                adminUserId,
                action: 'user.bulk_feature',
                targetType: 'user',
                targetId: id,
                payload: { bulk: true, count: batchSize, featuredOrder },
            }));
            await this.auditRepo.save(auditEntries);
        }
        return { updated, notFound, featuredOrder };
    }
    async bulkUnfeatureWorkers(dto, adminUserId) {
        const { userIds } = dto;
        const found = await this.usersRepo.find({
            where: { id: (0, typeorm_2.In)(userIds) },
            select: ['id'],
        });
        const foundSet = new Set(found.map((u) => u.id));
        const notFound = userIds.filter((id) => !foundSet.has(id));
        const presentIds = userIds.filter((id) => foundSet.has(id));
        let updated = 0;
        if (presentIds.length > 0) {
            const result = await this.providersRepo
                .createQueryBuilder()
                .update(provider_entity_1.Provider)
                .set({ featuredOrder: null })
                .where('userId IN (:...ids)', { ids: presentIds })
                .execute();
            updated = result.affected ?? 0;
            const batchSize = presentIds.length;
            const auditEntries = presentIds.map((id) => this.auditRepo.create({
                adminUserId,
                action: 'user.bulk_feature',
                targetType: 'user',
                targetId: id,
                payload: { bulk: true, count: batchSize, featuredOrder: null },
            }));
            await this.auditRepo.save(auditEntries);
        }
        return { updated, notFound };
    }
    async getBroadcastHistory() {
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
            .getRawMany();
        return rows.map((r) => ({ ...r, count: Number(r.count) }));
    }
    async broadcastNotification(dto) {
        const qb = this.usersRepo
            .createQueryBuilder('u')
            .select('u.id', 'id')
            .where('u.role = :role', { role: user_entity_1.UserRole.USER });
        switch (dto.segment) {
            case broadcast_notification_dto_1.BroadcastSegment.WORKERS:
                qb.andWhere("u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'");
                break;
            case broadcast_notification_dto_1.BroadcastSegment.CUSTOMERS:
                qb.andWhere("(u.workerCategories IS NULL OR u.workerCategories = '' OR u.workerCategories = '[]')");
                break;
            case broadcast_notification_dto_1.BroadcastSegment.VERIFIED_WORKERS:
                qb.andWhere("u.workerCategories IS NOT NULL AND u.workerCategories != '' AND u.workerCategories != '[]'");
                qb.andWhere('u.identityVerified = :v', { v: true });
                break;
            case broadcast_notification_dto_1.BroadcastSegment.ALL:
            default:
                break;
        }
        const rows = await qb.getRawMany();
        if (rows.length === 0) {
            return { sent: 0, segment: dto.segment };
        }
        const entities = rows.map((r) => this.notificationRepo.create({
            userId: r.id,
            type: notification_entity_1.NotificationType.SYSTEM,
            title: dto.title,
            body: dto.message,
            isRead: false,
        }));
        const chunkSize = 500;
        for (let i = 0; i < entities.length; i += chunkSize) {
            await this.notificationRepo.save(entities.slice(i, i + chunkSize));
        }
        void this.broadcastFcmPush(rows.map((r) => r.id), dto.title, dto.message);
        return { sent: entities.length, segment: dto.segment };
    }
    async broadcastFcmPush(userIds, title, body) {
        if (!this.fcmService.isEnabled() || userIds.length === 0)
            return;
        try {
            const tokens = [];
            const pageSize = 1000;
            for (let i = 0; i < userIds.length; i += pageSize) {
                const page = userIds.slice(i, i + pageSize);
                const users = await this.usersRepo.find({
                    where: { id: (0, typeorm_2.In)(page) },
                    select: ['id', 'fcmTokens', 'pushNotificationsEnabled'],
                });
                for (const u of users) {
                    if (u.pushNotificationsEnabled === false)
                        continue;
                    if (Array.isArray(u.fcmTokens)) {
                        for (const t of u.fcmTokens) {
                            if (typeof t === 'string' && t.length > 0)
                                tokens.push(t);
                        }
                    }
                }
            }
            if (tokens.length === 0)
                return;
            await this.fcmService.sendToTokens(tokens, title, body, {
                type: 'system',
                broadcast: '1',
            });
        }
        catch {
        }
    }
    async getFlaggedItems() {
        const [chats, questions] = await Promise.all([
            this.chatRepo.find({
                where: { flagged: true },
                order: { createdAt: 'DESC' },
                take: 50,
            }),
            this.questionRepo.find({
                where: { flagged: true },
                order: { createdAt: 'DESC' },
                take: 50,
            }),
        ]);
        const items = [
            ...chats.map((c) => ({
                type: 'chat',
                id: c.id,
                text: c.text ?? c.message ?? '',
                flagReason: c.flagReason ?? null,
                userId: c.senderId ?? c.userId ?? '',
                createdAt: c.createdAt,
            })),
            ...questions.map((q) => ({
                type: 'question',
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
    async clearFlaggedChat(id) {
        await this.chatRepo.update(id, { text: '[silindi]', flagged: false });
        return { id, type: 'chat', cleared: true };
    }
    async clearFlaggedQuestion(id) {
        await this.questionRepo.update(id, { text: '[silindi]', flagged: false });
        return { id, type: 'question', cleared: true };
    }
    async getModerationQueue(type, page = 1, limit = 20) {
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
    async moderateItem(type, id, action) {
        if (!['approve', 'remove', 'ban_user'].includes(action)) {
            throw new common_1.BadRequestException('Geçersiz işlem');
        }
        if (type === 'job') {
            const job = await this.jobsRepo.findOne({ where: { id } });
            if (!job)
                throw new common_1.NotFoundException('İlan bulunamadı');
            if (action === 'approve') {
                await this.jobsRepo.update(id, { flagged: false, flagReason: null });
            }
            else if (action === 'remove') {
                await this.jobsRepo.update(id, { deletedAt: new Date(), flagged: false });
            }
            else {
                await this.usersRepo.update(job.customerId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' });
                await this.jobsRepo.update(id, { deletedAt: new Date(), flagged: false });
            }
        }
        else if (type === 'review') {
            const review = await this.reviewsRepo.findOne({ where: { id } });
            if (!review)
                throw new common_1.NotFoundException('Yorum bulunamadı');
            if (action === 'approve') {
                await this.reviewsRepo.update(id, { flagged: false, flagReason: null });
            }
            else if (action === 'remove') {
                await this.reviewsRepo.update(id, { deletedAt: new Date(), flagged: false });
            }
            else {
                await this.usersRepo.update(review.reviewerId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' });
                await this.reviewsRepo.update(id, { deletedAt: new Date(), flagged: false });
            }
        }
        else {
            const chat = await this.chatRepo.findOne({ where: { id } });
            if (!chat)
                throw new common_1.NotFoundException('Mesaj bulunamadı');
            if (action === 'approve') {
                await this.chatRepo.update(id, { flagged: false });
            }
            else if (action === 'remove') {
                await this.chatRepo.update(id, { message: '[silindi]', flagged: false });
            }
            else {
                const senderId = chat.from;
                if (senderId)
                    await this.usersRepo.update(senderId, { suspended: true, suspendedAt: new Date(), suspendedReason: 'Phase 116 fraud moderation' });
                await this.chatRepo.update(id, { message: '[silindi]', flagged: false });
            }
        }
        return { id, type, action, ok: true };
    }
    listPromoCodes() {
        return this.promoService.findAll();
    }
    createPromoCode(dto) {
        return this.promoService.create(dto);
    }
    updatePromoCode(id, dto) {
        return this.promoService.update(id, dto);
    }
    deletePromoCode(id) {
        return this.promoService.remove(id);
    }
    async getRevenue() {
        const baseSelect = (qb) => qb
            .select('COALESCE(SUM(e.amount), 0)', 'totalGross')
            .addSelect('COALESCE(SUM(e.platformFeeAmount), 0)', 'totalPlatformFee')
            .addSelect('COALESCE(SUM(e.taskerNetAmount), 0)', 'totalTaskerNet')
            .addSelect('COUNT(*)', 'releasedCount')
            .where('e.status = :status', { status: payment_escrow_entity_1.EscrowStatus.RELEASED });
        const allRow = await baseSelect(this.escrowRepo.createQueryBuilder('e')).getRawOne();
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const last30Row = await baseSelect(this.escrowRepo.createQueryBuilder('e'))
            .andWhere('e.releasedAt >= :cutoff', { cutoff })
            .getRawOne();
        const toNum = (v) => Number(v ?? 0);
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
        const t0 = Date.now();
        const [totalJobs, totalUsers, totalServiceRequests, openServiceRequests, totalWorkers, verifiedWorkers, totalOffers, totalBookings, totalReviews, openJobs, completedJobs, chartData,] = await Promise.all([
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
            this.jobsRepo.count({ where: { status: job_entity_1.JobStatus.OPEN } }),
            this.jobsRepo.count({ where: { status: job_entity_1.JobStatus.COMPLETED } }),
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
        const ranges = last7Days.map((date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            return { date, nextDay, label: date.toLocaleDateString('tr-TR') };
        });
        const [jobCounts, userCounts] = await Promise.all([
            Promise.all(ranges.map(({ date, nextDay }) => this.jobsRepo.count({ where: { createdAt: (0, typeorm_2.Between)(date, nextDay) } }))),
            Promise.all(ranges.map(({ date, nextDay }) => this.usersRepo.count({ where: { createdAt: (0, typeorm_2.Between)(date, nextDay) } }))),
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
    async getJobsPaged(q) {
        const { page, limit, skip, take } = (0, admin_list_query_dto_1.normalizePaging)(q);
        const search = q.search?.trim();
        const status = q.status?.trim();
        const where = [];
        if (search) {
            where.push({ title: (0, typeorm_2.ILike)(`%${search}%`) });
            where.push({ category: (0, typeorm_2.ILike)(`%${search}%`) });
            where.push({ location: (0, typeorm_2.ILike)(`%${search}%`) });
        }
        let whereClause = where.length > 0 ? where : undefined;
        if (status) {
            if (Array.isArray(whereClause)) {
                whereClause = whereClause.map((w) => ({
                    ...w,
                    status,
                }));
            }
            else {
                whereClause = { status };
            }
        }
        const [items, total] = await this.jobsRepo.findAndCount({
            where: whereClause,
            order: { createdAt: 'DESC' },
            skip,
            take,
            relations: ['customer'],
        });
        return (0, admin_list_query_dto_1.buildPaginated)(items, total, page, limit);
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
    async getUsersPaged(q) {
        const { page, limit, skip, take } = (0, admin_list_query_dto_1.normalizePaging)(q);
        const search = q.search?.trim();
        const status = q.status?.trim();
        const baseFilter = {};
        if (status === 'suspended')
            baseFilter.suspended = true;
        else if (status === 'verified')
            baseFilter.identityVerified = true;
        else if (status === 'unverified')
            baseFilter.identityVerified = false;
        else if (status === 'worker' || status === 'customer' || status === 'admin')
            baseFilter.role = status;
        const orBranches = [];
        if (search) {
            orBranches.push({ ...baseFilter, fullName: (0, typeorm_2.ILike)(`%${search}%`) });
            orBranches.push({ ...baseFilter, email: (0, typeorm_2.ILike)(`%${search}%`) });
            orBranches.push({ ...baseFilter, phoneNumber: (0, typeorm_2.ILike)(`%${search}%`) });
        }
        const where = orBranches.length > 0
            ? orBranches
            : Object.keys(baseFilter).length > 0
                ? baseFilter
                : undefined;
        const [items, total] = await this.usersRepo.findAndCount({
            where: where,
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
        void typeorm_2.Raw;
        return (0, admin_list_query_dto_1.buildPaginated)(items, total, page, limit);
    }
    async getAllServiceRequests(limit = 50) {
        return this.srRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }
    async setServiceRequestFeaturedOrder(id, featuredOrder) {
        return this.srRepo.update(id, { featuredOrder });
    }
    async setJobFeaturedOrder(id, featuredOrder) {
        return this.jobsRepo.update(id, { featuredOrder });
    }
    async verifyUser(id, identityVerified) {
        return this.usersRepo.update(id, { identityVerified });
    }
    async suspendUser(targetId, dto, adminUserId) {
        if (targetId === adminUserId) {
            throw new common_1.BadRequestException('Kendi hesabınızı askıya alamazsınız');
        }
        const target = await this.usersRepo.findOne({ where: { id: targetId } });
        if (!target)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (target.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.BadRequestException('Admin hesabı askıya alınamaz');
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
    async setUserBadges(id, badges) {
        const allowed = ['insurance', 'premium', 'partner', 'verified_business'];
        const filtered = (badges ?? []).filter((b) => allowed.includes(b));
        await this.usersRepo.update(id, { badges: filtered });
        return { id, badges: filtered };
    }
    async setUserSkills(id, skills) {
        const cleaned = Array.from(new Set((skills ?? [])
            .map((s) => (typeof s === 'string' ? s.trim() : ''))
            .filter((s) => s.length > 0 && s.length <= 50))).slice(0, 20);
        await this.usersRepo.update(id, { workerSkills: cleaned });
        return { id, workerSkills: cleaned };
    }
    static ADMIN_MANUAL_BADGE_KEYS = [
        'top_partner',
        'platform_pioneer',
        'community_hero',
        'vip',
    ];
    async grantManualBadge(userId, badgeKey) {
        if (!AdminService_1.ADMIN_MANUAL_BADGE_KEYS.includes(badgeKey)) {
            throw new common_1.BadRequestException('Geçersiz rozet anahtarı');
        }
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = user.manualBadges ?? [];
        const next = current.includes(badgeKey) ? current : [...current, badgeKey];
        await this.usersRepo.update(userId, { manualBadges: next });
        return { id: userId, manualBadges: next };
    }
    async revokeManualBadge(userId, badgeKey) {
        if (!AdminService_1.ADMIN_MANUAL_BADGE_KEYS.includes(badgeKey)) {
            throw new common_1.BadRequestException('Geçersiz rozet anahtarı');
        }
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const next = (user.manualBadges ?? []).filter((b) => b !== badgeKey);
        await this.usersRepo.update(userId, { manualBadges: next });
        return { id: userId, manualBadges: next };
    }
    async getAnalyticsOverview() {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        try {
            const [dailyRegistrations, dailyJobs, revenueByDay, topCategories, workersByCity,] = await Promise.all([
                qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
          FROM users
          WHERE created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
                qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
          FROM jobs
          WHERE created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
                qr.query(`
          SELECT strftime('%Y-%m-%d', created_at) AS date,
                 SUM(amount) AS tokensPurchased
          FROM token_transactions
          WHERE type = 'purchase'
            AND created_at >= date('now', '-29 days')
          GROUP BY date
          ORDER BY date ASC
        `),
                qr.query(`
          SELECT category AS name, COUNT(*) AS jobCount
          FROM jobs
          WHERE category IS NOT NULL AND category != ''
          GROUP BY category
          ORDER BY jobCount DESC
          LIMIT 5
        `),
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
                dailyRegistrations: dailyRegistrations.map((r) => ({ date: r.date, count: Number(r.count) })),
                dailyJobs: dailyJobs.map((r) => ({ date: r.date, count: Number(r.count) })),
                revenueByDay: revenueByDay.map((r) => ({ date: r.date, tokensPurchased: Number(r.tokensPurchased ?? 0) })),
                topCategories: topCategories.map((r) => ({ name: r.name, jobCount: Number(r.jobCount) })),
                workersByCity: workersByCity.map((r) => ({ city: r.city, count: Number(r.count) })),
            };
        }
        finally {
            await qr.release();
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(service_request_entity_1.ServiceRequest)),
    __param(3, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(4, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(5, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(6, (0, typeorm_1.InjectRepository)(payment_escrow_entity_1.PaymentEscrow)),
    __param(7, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(8, (0, typeorm_1.InjectRepository)(job_question_entity_1.JobQuestion)),
    __param(9, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(10, (0, typeorm_1.InjectRepository)(admin_audit_log_entity_1.AdminAuditLog)),
    __param(11, (0, typeorm_1.InjectRepository)(provider_entity_1.Provider)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        promo_service_1.PromoService,
        fcm_service_1.FcmService,
        typeorm_2.DataSource])
], AdminService);
//# sourceMappingURL=admin.service.js.map