"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = exports.BOOST_ALLOWED_DAYS = exports.BOOST_TOKEN_COST_PER_DAY = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = __importStar(require("crypto"));
const job_entity_1 = require("./job.entity");
const offer_entity_1 = require("./offer.entity");
const users_service_1 = require("../users/users.service");
const tokens_service_1 = require("../tokens/tokens.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/notification.entity");
const escrow_service_1 = require("../escrow/escrow.service");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const cancellation_service_1 = require("../cancellation/cancellation.service");
const disputes_service_1 = require("../disputes/disputes.service");
const fraud_detection_service_1 = require("../ai/fraud-detection.service");
const category_subscriptions_service_1 = require("../subscriptions/category-subscriptions.service");
const geohash_util_1 = require("../../common/geohash.util");
const money_util_1 = require("../../common/money.util");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const sharp = require('sharp');
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';
exports.BOOST_TOKEN_COST_PER_DAY = 10;
exports.BOOST_ALLOWED_DAYS = [3, 7, 14];
let JobsService = JobsService_1 = class JobsService {
    jobsRepository;
    offersRepository;
    usersService;
    dataSource;
    notificationsService;
    escrowService;
    cancellationService;
    disputesService;
    tokensService;
    fraudDetection;
    categorySubsService;
    logger = new common_1.Logger(JobsService_1.name);
    constructor(jobsRepository, offersRepository, usersService, dataSource, notificationsService, escrowService, cancellationService, disputesService, tokensService, fraudDetection, categorySubsService) {
        this.jobsRepository = jobsRepository;
        this.offersRepository = offersRepository;
        this.usersService = usersService;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.escrowService = escrowService;
        this.cancellationService = cancellationService;
        this.disputesService = disputesService;
        this.tokensService = tokensService;
        this.fraudDetection = fraudDetection;
        this.categorySubsService = categorySubsService;
    }
    async _notifyCategorySubscribers(job) {
        try {
            const matches = await this.categorySubsService.findMatches(job.category, job.location);
            for (const sub of matches) {
                if (sub.userId === job.customerId)
                    continue;
                await this.notificationsService.send({
                    userId: sub.userId,
                    type: notification_entity_1.NotificationType.SYSTEM,
                    title: 'Aradığın iş geldi',
                    body: `${job.category} kategorisinde yeni ilan: ${job.title}`,
                    relatedType: 'job',
                    relatedId: job.id,
                });
                await this.categorySubsService.markNotified(sub.id);
            }
        }
        catch (e) {
            this.logger.warn(`category subscription notify failed: ${String(e)}`);
        }
    }
    async boost(jobId, days, userId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.customerId !== userId) {
            throw new common_1.ForbiddenException('Bu ilan size ait değil');
        }
        if (!exports.BOOST_ALLOWED_DAYS.includes(days)) {
            throw new common_1.BadRequestException('Geçersiz süre — 3, 7 veya 14 gün');
        }
        const cost = days * exports.BOOST_TOKEN_COST_PER_DAY;
        await this.tokensService.spend(userId, cost, `İlan boost (${days} gün)`);
        const maxRow = await this.jobsRepository
            .createQueryBuilder('job')
            .select('MAX(job.featuredOrder)', 'max')
            .getRawOne();
        const nextOrder = (maxRow?.max ?? 0) + 1;
        job.featuredOrder = nextOrder;
        job.featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        return this.jobsRepository.save(job);
    }
    async onModuleInit() {
        const seedUser = await this.usersService.findByEmail('seed@yapgitsin.tr');
        if (!seedUser) {
            await this.usersService.create({
                id: SEED_USER_ID,
                fullName: 'Seed User',
                phoneNumber: '05555555555',
                email: 'seed@yapgitsin.tr',
                passwordHash: 'hashed_password',
            });
        }
        const count = await this.jobsRepository.count();
        if (count === 0) {
            const userId = seedUser?.id ?? SEED_USER_ID;
            await this.jobsRepository.save([
                {
                    title: 'Salon Badana',
                    description: '3+1 daire, düz boya yeterli. Malzeme bizden.',
                    category: 'Boya & Badana',
                    location: 'Kadıköy, İstanbul',
                    budgetMin: 500,
                    budgetMax: 1500,
                    budgetMinMinor: (0, money_util_1.tlToMinor)(500),
                    budgetMaxMinor: (0, money_util_1.tlToMinor)(1500),
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
                {
                    title: 'Mutfak Musluk Tamiri',
                    description: 'Musluk su kaçırıyor, conta değişimi veya yenileme gerek.',
                    category: 'Tesisat',
                    location: 'Beşiktaş, İstanbul',
                    budgetMin: 100,
                    budgetMax: 300,
                    budgetMinMinor: (0, money_util_1.tlToMinor)(100),
                    budgetMaxMinor: (0, money_util_1.tlToMinor)(300),
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
                {
                    title: 'Haftalık Ev Temizliği',
                    description: 'Her Cuma günü rutin ev temizliği yapılacak.',
                    category: 'Temizlik',
                    location: 'Üsküdar, İstanbul',
                    budgetMin: 800,
                    budgetMax: 1200,
                    budgetMinMinor: (0, money_util_1.tlToMinor)(800),
                    budgetMaxMinor: (0, money_util_1.tlToMinor)(1200),
                    status: job_entity_1.JobStatus.OPEN,
                    customerId: userId,
                },
            ]);
        }
    }
    async findAll(filters) {
        const limit = filters?.limit ?? 20;
        const page = filters?.page ?? 1;
        const query = this.jobsRepository.createQueryBuilder('job');
        if (filters?.category) {
            query.andWhere('job.category = :category', { category: filters.category });
        }
        if (filters?.status) {
            query.andWhere('job.status = :status', { status: filters.status });
        }
        if (filters?.customerId) {
            query.andWhere('job.customerId = :customerId', { customerId: filters.customerId });
        }
        if (filters?.q && filters.q.trim().length > 0) {
            const q = `%${filters.q.trim().toLowerCase()}%`;
            query.andWhere('(LOWER(job.title) LIKE :q OR LOWER(job.description) LIKE :q)', { q });
        }
        query
            .orderBy('CASE WHEN job.featuredOrder IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
            .addOrderBy('job.featuredOrder', 'ASC')
            .addOrderBy('job.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [data, total] = await query.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async setFeaturedOrder(id, featuredOrder) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        job.featuredOrder = featuredOrder;
        return this.jobsRepository.save(job);
    }
    async findOne(id) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        const customer = await this.usersService.findById(job.customerId);
        if (customer) {
            const { passwordHash: _ph, ...safe } = customer;
            job.customer = {
                id: safe.id,
                fullName: safe.fullName,
                profileImageUrl: safe.profileImageUrl,
                averageRating: safe.averageRating ?? 0,
                totalReviews: safe.totalReviews ?? 0,
                reputationScore: safe.reputationScore ?? 0,
                city: safe.city ?? '',
                createdAt: safe.createdAt,
                identityVerified: safe.identityVerified ?? false,
                asCustomerTotal: safe.asCustomerTotal ?? 0,
                asCustomerSuccess: safe.asCustomerSuccess ?? 0,
            };
        }
        return job;
    }
    async create(createJobDto, customerId) {
        const job = this.jobsRepository.create({
            ...createJobDto,
            customerId,
            status: job_entity_1.JobStatus.OPEN,
            budgetMinMinor: (0, money_util_1.tlToMinor)(createJobDto.budgetMin),
            budgetMaxMinor: (0, money_util_1.tlToMinor)(createJobDto.budgetMax),
        });
        if (job.latitude != null && job.longitude != null) {
            job.geohash = (0, geohash_util_1.encodeGeohash)(job.latitude, job.longitude, 6) || null;
        }
        const saved = await this.jobsRepository.save(job);
        this.fraudDetection
            .analyzeJobListing(saved.title, saved.description)
            .then(async (r) => {
            if (r.score >= 70) {
                await this.jobsRepository.update(saved.id, {
                    flagged: true,
                    flagReason: r.reasons.join('; '),
                    fraudScore: r.score,
                });
            }
            else {
                await this.jobsRepository.update(saved.id, { fraudScore: r.score });
            }
        })
            .catch(() => undefined);
        void this._notifyCategorySubscribers(saved);
        return saved;
    }
    async update(id, updateJobDto, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        if (requesterId && job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Bu ilanı düzenleme yetkiniz yok.');
        }
        const prevStatus = job.status;
        if (updateJobDto.status && updateJobDto.status !== prevStatus) {
            if (!(0, job_entity_1.isValidTransition)(prevStatus, updateJobDto.status)) {
                throw new common_1.ForbiddenException(`Geçersiz durum geçişi: ${prevStatus} → ${updateJobDto.status}`);
            }
        }
        Object.assign(job, updateJobDto);
        if (job.latitude != null && job.longitude != null) {
            job.geohash = (0, geohash_util_1.encodeGeohash)(job.latitude, job.longitude, 6) || null;
        }
        const saved = await this.jobsRepository.save(job);
        if (updateJobDto.status && updateJobDto.status !== prevStatus) {
            await this._trackStatusChange(saved.id, saved.customerId, prevStatus, saved.status);
            if (prevStatus !== job_entity_1.JobStatus.CANCELLED &&
                saved.status === job_entity_1.JobStatus.CANCELLED) {
                try {
                    const acceptedOfferForPolicy = await this.offersRepository.findOne({
                        where: { jobId: saved.id, status: offer_entity_1.OfferStatus.ACCEPTED },
                    });
                    let appliesTo;
                    let appliesAtStage;
                    if (!acceptedOfferForPolicy) {
                        appliesTo = 'customer_cancel';
                        appliesAtStage = 'before_assignment';
                    }
                    else {
                        const isCustomerCancel = requesterId === saved.customerId;
                        appliesTo = isCustomerCancel ? 'customer_cancel' : 'tasker_cancel';
                        if (prevStatus === job_entity_1.JobStatus.OPEN)
                            appliesAtStage = 'before_assignment';
                        else if (prevStatus === job_entity_1.JobStatus.IN_PROGRESS)
                            appliesAtStage = 'in_progress';
                        else if (prevStatus === job_entity_1.JobStatus.PENDING_COMPLETION)
                            appliesAtStage = 'pending_completion';
                        else
                            appliesAtStage = 'any';
                    }
                    const hoursElapsed = acceptedOfferForPolicy
                        ? (Date.now() -
                            new Date(acceptedOfferForPolicy.updatedAt).getTime()) /
                            3600000
                        : 0;
                    const policy = await this.cancellationService.findApplicable({
                        appliesTo,
                        appliesAtStage,
                        hoursElapsedSinceAccept: hoursElapsed,
                    });
                    const escrow = await this.escrowService.getByJob(saved.id);
                    if (policy && escrow && escrow.status === payment_escrow_entity_1.EscrowStatus.HELD) {
                        const calc = this.cancellationService.calculateRefund(escrow.amount, policy);
                        const refundUserId = 'system';
                        if (calc.refundAmount >= escrow.amount) {
                            await this.escrowService.refund(escrow.id, refundUserId, calc.refundAmount, `İptal politikası: ${policy.name}`);
                        }
                        else if (calc.refundAmount > 0) {
                            await this.escrowService.refund(escrow.id, refundUserId, calc.refundAmount, `Kısmi iade — ${policy.name}`);
                        }
                    }
                }
                catch (err) {
                    this.logger.warn(`Cancellation policy application failed for job ${saved.id}: ${err?.message ?? err}`);
                }
            }
            if (saved.status === job_entity_1.JobStatus.CANCELLED) {
                const acceptedOffer = await this.offersRepository.findOne({
                    where: { jobId: saved.id, status: offer_entity_1.OfferStatus.ACCEPTED },
                });
                const otherUserId = requesterId === saved.customerId
                    ? acceptedOffer?.userId ?? null
                    : saved.customerId;
                if (otherUserId && otherUserId !== requesterId) {
                    await this.notificationsService.send({
                        userId: otherUserId,
                        type: notification_entity_1.NotificationType.JOB_CANCELLED,
                        title: 'İş iptal edildi',
                        body: `"${saved.title}" ilanı iptal edildi.`,
                        refId: saved.id,
                    });
                }
            }
        }
        return saved;
    }
    async submitCompletion(jobId, taskerId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${jobId}`);
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        if (!acceptedOffer || acceptedOffer.userId !== taskerId) {
            throw new common_1.ForbiddenException('Bu ilana atanan usta değilsiniz.');
        }
        if (!(0, job_entity_1.isValidTransition)(job.status, job_entity_1.JobStatus.PENDING_COMPLETION)) {
            throw new common_1.ForbiddenException(`Geçersiz geçiş: ${job.status} → pending_completion`);
        }
        job.status = job_entity_1.JobStatus.PENDING_COMPLETION;
        const saved = await this.jobsRepository.save(job);
        await this.notificationsService.send({
            userId: saved.customerId,
            type: notification_entity_1.NotificationType.JOB_PENDING_COMPLETION,
            title: 'İş tamamlandı olarak işaretlendi',
            body: `"${saved.title}" ilanınız için usta işi bitirdiğini belirtti. Lütfen onaylayın.`,
            refId: saved.id,
        });
        return saved;
    }
    async approveCompletion(jobId, customerId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${jobId}`);
        if (job.customerId !== customerId) {
            throw new common_1.ForbiddenException('Bu ilanın sahibi değilsiniz.');
        }
        if (!(0, job_entity_1.isValidTransition)(job.status, job_entity_1.JobStatus.COMPLETED)) {
            throw new common_1.ForbiddenException(`Geçersiz geçiş: ${job.status} → completed (ilan ${job.status})`);
        }
        const prev = job.status;
        job.status = job_entity_1.JobStatus.COMPLETED;
        const saved = await this.jobsRepository.save(job);
        await this._trackStatusChange(saved.id, saved.customerId, prev, saved.status);
        try {
            const escrow = await this.escrowService.getByJob(saved.id);
            if (escrow &&
                (escrow.status === payment_escrow_entity_1.EscrowStatus.HELD ||
                    escrow.status === payment_escrow_entity_1.EscrowStatus.DISPUTED)) {
                await this.escrowService.release(escrow.id, customerId, 'Müşteri tamamlamayı onayladı');
            }
        }
        catch (err) {
            this.logger.warn(`Escrow release failed for job ${saved.id}: ${err?.message ?? err}`);
        }
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId: saved.id, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        if (acceptedOffer) {
            await this.notificationsService.send({
                userId: acceptedOffer.userId,
                type: notification_entity_1.NotificationType.JOB_COMPLETED,
                title: 'İş tamamlandı',
                body: `"${saved.title}" ilanı müşteri tarafından onaylandı. Tebrikler!`,
                refId: saved.id,
            });
        }
        return saved;
    }
    async raiseDispute(jobId, requesterId, payload) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${jobId}`);
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        const isCustomer = job.customerId === requesterId;
        const isTasker = acceptedOffer?.userId === requesterId;
        if (!isCustomer && !isTasker) {
            throw new common_1.ForbiddenException('Sadece taraflar uyuşmazlık açabilir.');
        }
        if (!(0, job_entity_1.isValidTransition)(job.status, job_entity_1.JobStatus.DISPUTED)) {
            throw new common_1.ForbiddenException(`Bu durumdan uyuşmazlık açılamaz: ${job.status}`);
        }
        job.status = job_entity_1.JobStatus.DISPUTED;
        const saved = await this.jobsRepository.save(job);
        let escrowId = null;
        try {
            const escrow = await this.escrowService.getByJob(saved.id);
            if (escrow) {
                escrowId = escrow.id;
                if (escrow.status === payment_escrow_entity_1.EscrowStatus.HELD) {
                    await this.escrowService.dispute(escrow.id, requesterId, 'İlan disputed durumuna geçti');
                }
            }
        }
        catch (err) {
            this.logger.warn(`Escrow dispute failed for job ${saved.id}: ${err?.message ?? err}`);
        }
        const counterPartyUserId = isCustomer
            ? acceptedOffer?.userId ?? null
            : job.customerId;
        if (counterPartyUserId) {
            try {
                await this.disputesService.create({
                    jobId: saved.id,
                    raisedByUserId: requesterId,
                    counterPartyUserId,
                    escrowId,
                    disputeType: payload.disputeType,
                    reason: payload.reason,
                    evidenceUrls: payload.evidenceUrls ?? null,
                });
            }
            catch (err) {
                this.logger.warn(`JobDispute create failed for job ${saved.id}: ${err?.message ?? err}`);
            }
        }
        if (counterPartyUserId) {
            await this.notificationsService.send({
                userId: counterPartyUserId,
                type: notification_entity_1.NotificationType.DISPUTE_OPENED,
                title: 'Uyuşmazlık açıldı',
                body: `"${saved.title}" ilanı için karşı taraf uyuşmazlık açtı.`,
                refId: saved.id,
            });
        }
        return saved;
    }
    async _trackStatusChange(jobId, customerId, prev, next) {
        if (next === job_entity_1.JobStatus.COMPLETED) {
            if (prev !== job_entity_1.JobStatus.COMPLETED)
                await this.usersService.bumpStat(customerId, 'asCustomerTotal');
            await this.usersService.bumpStat(customerId, 'asCustomerSuccess');
            await this.usersService.recalcReputation(customerId);
            const acceptedOffer = await this.offersRepository.findOne({
                where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
            });
            if (acceptedOffer) {
                await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerSuccess');
                await this.usersService.recalcReputation(acceptedOffer.userId);
            }
        }
        else if (next === job_entity_1.JobStatus.CANCELLED) {
            if (prev !== job_entity_1.JobStatus.CANCELLED)
                await this.usersService.bumpStat(customerId, 'asCustomerTotal');
            await this.usersService.bumpStat(customerId, 'asCustomerFail');
            await this.usersService.recalcReputation(customerId);
            const acceptedOffer = await this.offersRepository.findOne({
                where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
            });
            if (acceptedOffer) {
                await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerFail');
                await this.usersService.recalcReputation(acceptedOffer.userId);
            }
        }
    }
    async findNearby(lat, lng, radiusKm = 20, category) {
        const haversine = `(6371 * acos(
      cos(radians(?)) * cos(radians(j.latitude)) *
      cos(radians(j.longitude) - radians(?)) +
      sin(radians(?)) * sin(radians(j.latitude))
    ))`;
        let sql = `
      SELECT j.*, ${haversine} AS distanceKm
      FROM jobs j
      WHERE j.latitude IS NOT NULL
        AND j.longitude IS NOT NULL
        AND j.status = 'open'
        AND ${haversine} <= ?
    `;
        const params = [lat, lng, lat, lat, lng, lat, radiusKm];
        if (category) {
            sql += ` AND LOWER(j.category) = LOWER(?)`;
            params.push(category);
        }
        sql += ` ORDER BY distanceKm ASC LIMIT 50`;
        const rows = await this.dataSource.query(sql, params);
        return rows;
    }
    async remove(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException(`İlan bulunamadı: #${id}`);
        if (requesterId && job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Bu ilanı silme yetkiniz yok.');
        }
        await this.jobsRepository.remove(job);
    }
    async generateQr(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.customerId !== requesterId) {
            throw new common_1.ForbiddenException('Yalnızca müşteri QR kod oluşturabilir.');
        }
        if (job.status !== job_entity_1.JobStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('QR kod sadece devam eden işler için oluşturulabilir.');
        }
        const qrCode = crypto.randomUUID();
        job.qrCode = qrCode;
        await this.jobsRepository.save(job);
        return { qrCode };
    }
    async verifyQr(id, qrCode, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (job.customerId === requesterId) {
            throw new common_1.ForbiddenException('QR kodu usta taramalıdır.');
        }
        if (!job.qrCode || job.qrCode !== qrCode) {
            throw new common_1.BadRequestException('Geçersiz QR kod.');
        }
        job.isQrVerified = true;
        await this.jobsRepository.save(job);
        return { success: true };
    }
    async completeJobWithPayment(id, requesterId) {
        const job = await this.jobsRepository.findOne({ where: { id } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        if (!job.isQrVerified) {
            throw new common_1.BadRequestException('İşi tamamlamadan önce müşterinin QR kodunu taramalısınız.');
        }
        const hasPhotos = job.endJobPhotos && job.endJobPhotos.length > 0;
        const hasVideos = job.endJobVideos && job.endJobVideos.length > 0;
        if (!hasPhotos && !hasVideos) {
            throw new common_1.BadRequestException('İşi tamamlamak için en az bir adet iş sonu görseli veya videosu eklemelisiniz.');
        }
        const acceptedOffer = await this.offersRepository.findOne({
            where: { jobId: id, status: offer_entity_1.OfferStatus.ACCEPTED },
        });
        if (!acceptedOffer) {
            throw new common_1.BadRequestException('Bu işe ait kabul edilmiş bir teklif bulunamadı.');
        }
        const jobPrice = acceptedOffer.counterPrice || acceptedOffer.price;
        const platformCommissionRate = 0.10;
        const commissionAmount = jobPrice * platformCommissionRate;
        const workerAmount = jobPrice - commissionAmount;
        this.logger.log(`[BANKA İŞLEMİ] İlan=${job.id} müşteri=${jobPrice}₺ komisyon=${commissionAmount.toFixed(2)}₺ usta=${workerAmount.toFixed(2)}₺`);
        const prevStatus = job.status;
        job.status = job_entity_1.JobStatus.COMPLETED;
        const saved = await this.jobsRepository.save(job);
        await this._trackStatusChange(saved.id, saved.customerId, prevStatus, saved.status);
        return saved;
    }
    async uploadPhotosBulk(jobId, files, userId) {
        const job = await this.jobsRepository.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('İlan bulunamadı');
        const isOwner = job.customerId === userId;
        if (!isOwner) {
            const accepted = await this.offersRepository.findOne({
                where: { jobId, status: offer_entity_1.OfferStatus.ACCEPTED },
            });
            if (!accepted || accepted.userId !== userId) {
                throw new common_1.ForbiddenException('Bu işlem için yetkiniz yok');
            }
        }
        const current = job.photos ?? [];
        if (current.length + files.length > 5) {
            throw new common_1.BadRequestException(`Toplam fotoğraf sayısı 5'i geçemez (mevcut: ${current.length})`);
        }
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'jobs');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const newUrls = [];
        for (const file of files) {
            const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const filename = `${baseName}.jpg`;
            const dest = (0, path_1.join)(dir, filename);
            await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(dest);
            newUrls.push(`/uploads/jobs/${filename}`);
        }
        job.photos = [...current, ...newUrls];
        await this.jobsRepository.save(job);
        return { photos: job.photos };
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(1, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        escrow_service_1.EscrowService,
        cancellation_service_1.CancellationService,
        disputes_service_1.DisputesService,
        tokens_service_1.TokensService,
        fraud_detection_service_1.FraudDetectionService,
        category_subscriptions_service_1.CategorySubscriptionsService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map