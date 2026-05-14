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
var UsersController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const add_offer_template_dto_1 = require("./dto/add-offer-template.dto");
const add_message_template_dto_1 = require("./dto/add-message-template.dto");
const delete_account_dto_1 = require("./dto/delete-account.dto");
const admin_audit_service_1 = require("../admin-audit/admin-audit.service");
const data_privacy_service_1 = require("./data-privacy.service");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const passport_1 = require("@nestjs/passport");
const users_service_1 = require("./users.service");
const favorite_workers_service_1 = require("./favorite-workers.service");
const earnings_service_1 = require("./earnings.service");
const worker_insurance_service_1 = require("./worker-insurance.service");
const worker_certification_service_1 = require("./worker-certification.service");
const calendar_sync_service_1 = require("./calendar-sync.service");
const availability_service_1 = require("../availability/availability.service");
const job_entity_1 = require("../jobs/job.entity");
const review_entity_1 = require("../reviews/review.entity");
const offer_entity_1 = require("../jobs/offer.entity");
let UsersController = class UsersController {
    static { UsersController_1 = this; }
    svc;
    favWorkersSvc;
    earningsSvc;
    insuranceSvc;
    certificationSvc;
    calendarSyncSvc;
    availabilitySvc;
    adminAuditService;
    dataPrivacy;
    jobsRepo;
    reviewsRepo;
    offersRepo;
    cache;
    constructor(svc, favWorkersSvc, earningsSvc, insuranceSvc, certificationSvc, calendarSyncSvc, availabilitySvc, adminAuditService, dataPrivacy, jobsRepo, reviewsRepo, offersRepo, cache) {
        this.svc = svc;
        this.favWorkersSvc = favWorkersSvc;
        this.earningsSvc = earningsSvc;
        this.insuranceSvc = insuranceSvc;
        this.certificationSvc = certificationSvc;
        this.calendarSyncSvc = calendarSyncSvc;
        this.availabilitySvc = availabilitySvc;
        this.adminAuditService = adminAuditService;
        this.dataPrivacy = dataPrivacy;
        this.jobsRepo = jobsRepo;
        this.reviewsRepo = reviewsRepo;
        this.offersRepo = offersRepo;
        this.cache = cache;
    }
    static profileCacheKey(id) {
        return `worker:profile:${id}`;
    }
    static PROFILE_CACHE_TTL = 60 * 1000;
    async invalidateProfileCache(id) {
        try {
            await this.cache.del(UsersController_1.profileCacheKey(id));
        }
        catch {
        }
    }
    listFavoriteWorkers(req) {
        return this.favWorkersSvc.listFavorites(req.user.id);
    }
    addFavoriteWorker(req, workerId) {
        return this.favWorkersSvc.addFavorite(req.user.id, workerId);
    }
    removeFavoriteWorker(req, workerId) {
        return this.favWorkersSvc.removeFavorite(req.user.id, workerId);
    }
    async getMe(req) {
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const { passwordHash: _ph, ...safe } = user;
        const profileCompletion = this.svc.computeProfileCompletion(user);
        const badges = await this.svc.computeBadges(user);
        return { ...safe, profileCompletion, badges };
    }
    async getMyEarnings(req, monthsRaw) {
        const months = monthsRaw ? parseInt(monthsRaw, 10) : 6;
        return this.earningsSvc.getEarnings(req.user.id, isNaN(months) ? 6 : months);
    }
    getMyCompletion(req) {
        return this.svc.getCompletionScore(req.user.id);
    }
    getNotificationPreferences(req) {
        return this.svc.getNotificationPreferences(req.user.id);
    }
    updateNotificationPreferences(req, body) {
        return this.svc.updateNotificationPreferences(req.user.id, body?.preferences ?? null);
    }
    getOfferTemplates(req) {
        return this.svc.getOfferTemplates(req.user.id);
    }
    addOfferTemplate(req, body) {
        return this.svc.addOfferTemplate(req.user.id, body.text);
    }
    removeOfferTemplate(req, index) {
        return this.svc.removeOfferTemplate(req.user.id, index);
    }
    getMessageTemplates(req) {
        return this.svc.getMessageTemplates(req.user.id);
    }
    addMessageTemplate(req, body) {
        return this.svc.addMessageTemplate(req.user.id, body.text);
    }
    removeMessageTemplate(req, index) {
        return this.svc.removeMessageTemplate(req.user.id, index);
    }
    updateAvailability(req, body) {
        return this.svc.updateAvailability(req.user.id, body?.schedule ?? null);
    }
    async updateLocation(req, body) {
        await this.svc.updateLocation(req.user.id, body.latitude, body.longitude);
        return { ok: true };
    }
    async updateMe(req, body) {
        if (body.workerSkills) {
            body.workerSkills = Array.from(new Set(body.workerSkills
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .filter((s) => s.length > 0 && s.length <= 50))).slice(0, 20);
        }
        const updated = await this.svc.update(req.user.id, body);
        if (!updated)
            return null;
        await this.invalidateProfileCache(req.user.id);
        const { passwordHash: _ph, ...safe } = updated;
        return safe;
    }
    async registerFcmToken(req, body) {
        const tokens = await this.svc.addFcmToken(req.user.id, body?.token ?? '');
        return { tokens };
    }
    async unregisterFcmToken(req, body) {
        const tokens = await this.svc.removeFcmToken(req.user.id, body?.token ?? '');
        return { tokens };
    }
    async getMyInsurance(req) {
        const ins = await this.insuranceSvc.getByUserId(req.user.id);
        return ins ?? null;
    }
    async upsertMyInsurance(req, body) {
        return this.insuranceSvc.upsert(req.user.id, body);
    }
    async deleteMyInsurance(req) {
        return this.insuranceSvc.remove(req.user.id);
    }
    async listMyCertifications(req) {
        return this.certificationSvc.listOwn(req.user.id);
    }
    async addMyCertification(req, body) {
        return this.certificationSvc.create(req.user.id, body);
    }
    async deleteMyCertification(req, id) {
        return this.certificationSvc.deleteOwn(req.user.id, id);
    }
    async getPublicCertifications(userId) {
        const list = await this.certificationSvc.listPublic(userId);
        return list.map((c) => this.certificationSvc.toPublic(c));
    }
    async getPublicInsurance(id) {
        const ins = await this.insuranceSvc.getByUserId(id);
        if (!ins)
            return null;
        if (!this.insuranceSvc.isInsured(ins))
            return null;
        return this.insuranceSvc.toPublic(ins);
    }
    async exportMyData(req, res) {
        const data = await this.dataPrivacy.exportUserData(req.user.id);
        const stamp = new Date().toISOString().slice(0, 10);
        res.set('Content-Type', 'application/json; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="yapgitsin-veriler-${req.user.id}-${stamp}.json"`);
        res.send(JSON.stringify(data, null, 2));
    }
    async requestDataDeletion(req, body) {
        const reason = (body?.reason || '').trim() || null;
        const result = await this.dataPrivacy.createDeletionRequest(req.user.id, reason);
        await this.adminAuditService.logAction(req.user.id, 'user.data_delete_request', 'data_deletion_request', result.id, { reason });
        return result;
    }
    async deleteMe(req, body) {
        const result = await this.svc.deactivateAccount(req.user.id, body.password);
        await this.adminAuditService.logAction(req.user.id, 'user.self_delete', 'user', req.user.id, { userId: req.user.id });
        return result;
    }
    async addPortfolioPhoto(req, body) {
        const url = (body?.url || '').trim();
        if (!url)
            throw new common_1.BadRequestException('url gerekli');
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const current = Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [];
        if (current.length >= 10) {
            throw new common_1.BadRequestException('En fazla 10 portfolyo fotoğrafı eklenebilir');
        }
        if (current.includes(url))
            return { portfolioPhotos: current };
        const next = [...current, url];
        await this.svc.update(req.user.id, { portfolioPhotos: next });
        return { portfolioPhotos: next };
    }
    async removePortfolioPhoto(req, body) {
        const url = (body?.url || '').trim();
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const current = Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [];
        const next = current.filter((u) => u !== url);
        await this.svc.update(req.user.id, { portfolioPhotos: next });
        return { portfolioPhotos: next };
    }
    async addPortfolioVideo(req, body) {
        const url = (body?.url || '').trim();
        if (!url)
            throw new common_1.BadRequestException('url gerekli');
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const current = Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [];
        if (current.length >= 3) {
            throw new common_1.BadRequestException('En fazla 3 portfolyo videosu eklenebilir');
        }
        if (current.includes(url))
            return { videos: current };
        const next = [...current, url];
        await this.svc.update(req.user.id, { portfolioVideos: next });
        return { videos: next };
    }
    async removePortfolioVideo(req, body) {
        const url = (body?.url || '').trim();
        const user = await this.svc.findById(req.user.id);
        if (!user)
            return null;
        const current = Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [];
        const next = current.filter((u) => u !== url);
        await this.svc.update(req.user.id, { portfolioVideos: next });
        return { videos: next };
    }
    async setIntroVideo(req, body) {
        const url = (body?.url || '').trim();
        if (!url)
            throw new common_1.BadRequestException('url gerekli');
        const dur = typeof body?.duration === 'number' ? Math.round(body.duration) : null;
        if (dur != null && dur > 65) {
            throw new common_1.BadRequestException('Tanıtım videosu 60 saniyeyi geçemez');
        }
        await this.svc.update(req.user.id, {
            introVideoUrl: url,
            introVideoDuration: dur,
        });
        return { introVideoUrl: url, introVideoDuration: dur };
    }
    async removeIntroVideo(req) {
        await this.svc.update(req.user.id, {
            introVideoUrl: null,
            introVideoDuration: null,
        });
        return { introVideoUrl: null, introVideoDuration: null };
    }
    enableCalendar(req) {
        return this.calendarSyncSvc.enable(req.user.id);
    }
    regenerateCalendar(req) {
        return this.calendarSyncSvc.regenerate(req.user.id);
    }
    disableCalendar(req) {
        return this.calendarSyncSvc.disable(req.user.id);
    }
    async getCalendarIcs(userId, token, res) {
        const ics = await this.calendarSyncSvc.generateIcs(userId, token || '');
        if (!ics) {
            res.status(404).send('Not Found');
            return;
        }
        res.set('Content-Type', 'text/calendar; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=3600');
        res.set('Content-Disposition', 'inline; filename="yapgitsin-takvim.ics"');
        res.send(ics);
    }
    async getNearbyWorkers(lat, lon, radius, category, verifiedOnly, page, limit) {
        const parseNum = (v) => {
            if (v == null || v === '')
                return undefined;
            const n = parseFloat(v);
            return isNaN(n) ? undefined : n;
        };
        const latN = parseNum(lat);
        const lonN = parseNum(lon);
        if (latN == null || lonN == null) {
            return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
        }
        const result = await this.svc.findNearbyWorkers({
            lat: latN,
            lon: lonN,
            radiusKm: parseNum(radius),
            category,
            verifiedOnly: verifiedOnly === 'true',
            page: parseNum(page),
            limit: parseNum(limit),
        });
        const data = result.data.map((u) => {
            const { passwordHash: _ph, ...safe } = u;
            return safe;
        });
        return { ...result, data };
    }
    async getWorkers(category, city, minRating, minRate, maxRate, verifiedOnly, availableOnly, availableDay, sortBy, page, limit, lat, lng, radiusKm, semanticQuery) {
        const parseNum = (v) => {
            if (v == null || v === '')
                return undefined;
            const n = parseFloat(v);
            return isNaN(n) ? undefined : n;
        };
        const parseBool = (v) => {
            if (v == null || v === '')
                return undefined;
            if (v === 'true')
                return true;
            if (v === 'false')
                return false;
            return undefined;
        };
        const minRatingN = parseNum(minRating);
        const sortAllowed = ['rating', 'reputation', 'rate_asc', 'rate_desc', 'nearest'];
        const sortByVal = sortBy && sortAllowed.includes(sortBy)
            ? sortBy
            : undefined;
        const latN = parseNum(lat);
        const lngN = parseNum(lng);
        const radiusN = parseNum(radiusKm);
        const result = await this.svc.findWorkersAdvanced({
            category,
            city,
            minRating: minRatingN != null ? Math.min(5, Math.max(0, minRatingN)) : undefined,
            minRate: parseNum(minRate),
            maxRate: parseNum(maxRate),
            verifiedOnly: parseBool(verifiedOnly),
            availableOnly: parseBool(availableOnly),
            availableDay: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(availableDay)
                ? availableDay
                : undefined,
            sortBy: sortByVal,
            page: parseNum(page),
            limit: parseNum(limit),
            lat: latN,
            lng: lngN,
            radiusKm: radiusN != null ? Math.min(200, Math.max(1, radiusN)) : undefined,
            semanticQuery: semanticQuery && semanticQuery.trim().length > 0
                ? semanticQuery.trim().slice(0, 200)
                : undefined,
        });
        const planMap = await this.svc.getActiveSubscriptionPlanKeys(result.data.map((u) => u.id));
        const data = await Promise.all(result.data.map(async (u) => {
            const { passwordHash: _ph, ...safe } = u;
            const badges = await this.svc.computeBadges(u, planMap.get(u.id) ?? null);
            return { ...safe, badges };
        }));
        return { ...result, data };
    }
    async getAvailabilitySlots(id, daysRaw) {
        const d = daysRaw ? parseInt(daysRaw, 10) : 30;
        return this.svc.getAvailabilitySlots(id, isNaN(d) ? 30 : d);
    }
    getMyAvailability(req) {
        return this.availabilitySvc.getSlots(req.user.id);
    }
    async bulkUpdateAvailability(req, body) {
        const userId = req.user.id;
        if (!Array.isArray(body?.days)) {
            throw new common_1.BadRequestException('days array required');
        }
        const existing = await this.availabilitySvc.getSlots(userId);
        const existingByDay = new Map(existing.map((s) => [s.dayOfWeek, s]));
        const results = [];
        for (const d of body.days) {
            if (d.dayOfWeek < 0 || d.dayOfWeek > 6)
                continue;
            const existing_ = existingByDay.get(d.dayOfWeek);
            if (!d.isAvailable) {
                if (existing_) {
                    await this.availabilitySvc.removeSlot(existing_.id, userId);
                }
            }
            else {
                if (existing_) {
                    const updated = await this.availabilitySvc.updateSlot(existing_.id, userId, {
                        startTime: d.startTime,
                        endTime: d.endTime,
                        isActive: true,
                    });
                    results.push(updated);
                }
                else {
                    const created = await this.availabilitySvc.addSlot(userId, {
                        dayOfWeek: d.dayOfWeek,
                        startTime: d.startTime,
                        endTime: d.endTime,
                    });
                    results.push(created);
                }
            }
        }
        return results;
    }
    getPublicAvailability(id) {
        return this.availabilitySvc.getSlots(id);
    }
    async getCustomerProfile(id) {
        const user = await this.svc.findById(id);
        if (!user)
            return null;
        const reviews = await this.reviewsRepo.find({
            where: { revieweeId: id },
            relations: ['reviewer'],
            order: { createdAt: 'DESC' },
            take: 10,
        });
        const customerReviews = reviews.filter((r) => {
            const wc = r.reviewer?.workerCategories;
            return Array.isArray(wc) && wc.length > 0;
        });
        const completedJobsCount = await this.jobsRepo.count({
            where: { customerId: id, status: job_entity_1.JobStatus.COMPLETED },
        });
        const completedJobs = await this.jobsRepo.find({
            where: { customerId: id, status: job_entity_1.JobStatus.COMPLETED },
            order: { updatedAt: 'DESC' },
            take: 200,
        });
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.push({ month: key, count: 0 });
        }
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        for (const j of completedJobs) {
            const dt = j.updatedAt ? new Date(j.updatedAt) : null;
            if (!dt || dt < sixMonthsAgo)
                continue;
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            const slot = months.find((m) => m.month === key);
            if (slot)
                slot.count++;
        }
        const catMap = new Map();
        for (const j of completedJobs) {
            if (!j.category)
                continue;
            catMap.set(j.category, (catMap.get(j.category) ?? 0) + 1);
        }
        const topCategories = [...catMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, count]) => ({ category, count }));
        let budgetSum = 0;
        let budgetCount = 0;
        for (const j of completedJobs) {
            const lo = Number(j.budgetMin) || 0;
            const hi = Number(j.budgetMax) || 0;
            let val = 0;
            if (lo > 0 && hi > 0)
                val = (lo + hi) / 2;
            else if (lo > 0)
                val = lo;
            else if (hi > 0)
                val = hi;
            if (val > 0) {
                budgetSum += val;
                budgetCount++;
            }
        }
        const avgBudget = budgetCount > 0 ? Math.round(budgetSum / budgetCount) : 0;
        const lastCompletedJobs = completedJobs.slice(0, 5).map((j) => ({
            id: j.id,
            title: j.title,
            category: j.category,
            completedAt: j.updatedAt,
            budget: Number(j.budgetMin) > 0 && Number(j.budgetMax) > 0
                ? (Number(j.budgetMin) + Number(j.budgetMax)) / 2
                : Number(j.budgetMin) || Number(j.budgetMax) || 0,
        }));
        const total = user.asCustomerTotal ?? 0;
        const success = user.asCustomerSuccess ?? 0;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
        return {
            id: user.id,
            fullName: user.fullName,
            profileImageUrl: user.profileImageUrl ?? null,
            joinedAt: user.createdAt,
            identityVerified: user.identityVerified === true,
            asCustomerTotal: total,
            asCustomerSuccess: success,
            customerSuccessRate: successRate,
            completedJobsCount,
            monthlyActivity: months,
            topCategories,
            avgBudget,
            lastCompletedJobs,
            reviewsReceivedAsCustomer: customerReviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                reviewerName: r.reviewer?.fullName ?? 'Usta',
                createdAt: r.createdAt,
            })),
        };
    }
    async getPublicProfile(id) {
        const cacheKey = UsersController_1.profileCacheKey(id);
        try {
            const cached = await this.cache.get(cacheKey);
            if (cached !== undefined && cached !== null)
                return cached;
        }
        catch {
        }
        const profile = await this.buildPublicProfile(id);
        if (profile !== null) {
            try {
                await this.cache.set(cacheKey, profile, UsersController_1.PROFILE_CACHE_TTL);
            }
            catch {
            }
        }
        return profile;
    }
    async buildPublicProfile(id) {
        const user = await this.svc.findById(id);
        if (!user)
            return null;
        const insurancePromise = this.insuranceSvc.getByUserId(id);
        const [reviews, customerJobs, workerJobs] = await Promise.all([
            this.reviewsRepo.find({
                where: { revieweeId: id },
                relations: ['reviewer'],
                order: { createdAt: 'DESC' },
                take: 10,
            }),
            this.jobsRepo.find({
                where: { customerId: id, status: job_entity_1.JobStatus.COMPLETED },
                order: { updatedAt: 'DESC' },
                take: 20,
            }),
            this.offersRepo
                .createQueryBuilder('offer')
                .innerJoinAndSelect('offer.job', 'job')
                .where('offer.userId = :id', { id })
                .andWhere('offer.status = :offerStatus', { offerStatus: offer_entity_1.OfferStatus.ACCEPTED })
                .andWhere('job.status = :jobStatus', { jobStatus: job_entity_1.JobStatus.COMPLETED })
                .orderBy('offer.updatedAt', 'DESC')
                .take(20)
                .getMany()
                .then((offers) => offers.map((o) => o.job)),
        ]);
        const allPhotoJobs = [...customerJobs, ...workerJobs];
        const pastPhotos = [];
        for (const job of allPhotoJobs) {
            if (pastPhotos.length >= 4)
                break;
            if (job?.photos?.length) {
                pastPhotos.push(...job.photos.slice(0, 4 - pastPhotos.length));
            }
        }
        const avgRating = reviews.length
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
            : 0;
        const reputation = Math.round(avgRating * 20) +
            (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
        const { passwordHash: _ph, ...safe } = user;
        const enrichedUser = {
            ...user,
            averageRating: avgRating,
            totalReviews: reviews.length,
            reputationScore: reputation,
        };
        const insurance = await insurancePromise;
        const insured = this.insuranceSvc.isInsured(insurance);
        const verifiedCerts = await this.certificationSvc.listPublic(id);
        const hasCert = await this.certificationSvc.hasVerifiedCertification(id);
        const badges = await this.svc.computeBadges(enrichedUser);
        if (insured)
            badges.push({ key: 'insured', label: 'Sigortalı', icon: '🛡️' });
        if (hasCert)
            badges.push({ key: 'certified', label: 'Sertifikalı', icon: '📜' });
        return {
            ...safe,
            insurance: insured && insurance ? this.insuranceSvc.toPublic(insurance) : null,
            averageRating: avgRating,
            totalReviews: reviews.length,
            reputationScore: reputation,
            badges,
            reviews: reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                replyText: r.replyText ?? null,
                repliedAt: r.repliedAt ?? null,
                reviewer: {
                    id: r.reviewer?.id,
                    fullName: r.reviewer?.fullName,
                    profileImageUrl: r.reviewer?.profileImageUrl,
                },
            })),
            pastPhotos,
            portfolioPhotos: Array.isArray(user.portfolioPhotos) ? user.portfolioPhotos : [],
            portfolioVideos: Array.isArray(user.portfolioVideos) ? user.portfolioVideos : [],
            introVideoUrl: user.introVideoUrl ?? null,
            introVideoDuration: user.introVideoDuration ?? null,
            certifications: verifiedCerts.map((c) => this.certificationSvc.toPublic(c)),
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/favorites'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listFavoriteWorkers", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/favorites/:workerId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('workerId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "addFavoriteWorker", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/favorites/:workerId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('workerId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeFavoriteWorker", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/earnings'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('months')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyEarnings", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/completion'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMyCompletion", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/notification-preferences'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getNotificationPreferences", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('me/notification-preferences'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateNotificationPreferences", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/offer-templates'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getOfferTemplates", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/offer-templates'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_offer_template_dto_1.AddOfferTemplateDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "addOfferTemplate", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/offer-templates/:index'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('index', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeOfferTemplate", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/message-templates'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMessageTemplates", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/message-templates'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, add_message_template_dto_1.AddMessageTemplateDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "addMessageTemplate", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/message-templates/:index'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('index', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "removeMessageTemplate", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('me/availability'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateAvailability", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('me/location'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/fcm-token'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "registerFcmToken", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/fcm-token'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "unregisterFcmToken", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/insurance'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyInsurance", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/insurance'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "upsertMyInsurance", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/insurance'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteMyInsurance", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/certifications'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listMyCertifications", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/certifications'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addMyCertification", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/certifications/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteMyCertification", null);
__decorate([
    (0, common_1.Get)(':userId/certifications'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicCertifications", null);
__decorate([
    (0, common_1.Get)(':id/insurance'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicInsurance", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me/data-export'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "exportMyData", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/data-delete-request'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "requestDataDeletion", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_account_dto_1.DeleteAccountDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/portfolio'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addPortfolioPhoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/portfolio'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removePortfolioPhoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/portfolio-video'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addPortfolioVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/portfolio-video'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removePortfolioVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/intro-video'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "setIntroVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('me/intro-video'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeIntroVideo", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/calendar/enable'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "enableCalendar", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/calendar/regenerate'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "regenerateCalendar", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('me/calendar/disable'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "disableCalendar", null);
__decorate([
    (0, common_1.Get)(':userId/calendar.ics'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCalendarIcs", null);
__decorate([
    (0, common_1.Get)('workers/nearby'),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lon')),
    __param(2, (0, common_1.Query)('radius')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('verifiedOnly')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getNearbyWorkers", null);
__decorate([
    (0, common_1.Get)('workers'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('city')),
    __param(2, (0, common_1.Query)('minRating')),
    __param(3, (0, common_1.Query)('minRate')),
    __param(4, (0, common_1.Query)('maxRate')),
    __param(5, (0, common_1.Query)('verifiedOnly')),
    __param(6, (0, common_1.Query)('availableOnly')),
    __param(7, (0, common_1.Query)('availableDay')),
    __param(8, (0, common_1.Query)('sortBy')),
    __param(9, (0, common_1.Query)('page')),
    __param(10, (0, common_1.Query)('limit')),
    __param(11, (0, common_1.Query)('lat')),
    __param(12, (0, common_1.Query)('lng')),
    __param(13, (0, common_1.Query)('radiusKm')),
    __param(14, (0, common_1.Query)('semanticQuery')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getWorkers", null);
__decorate([
    (0, common_1.Get)(':id/availability-slots'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAvailabilitySlots", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('availability/my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getMyAvailability", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)('availability'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "bulkUpdateAvailability", null);
__decorate([
    (0, common_1.Get)(':id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getPublicAvailability", null);
__decorate([
    (0, common_1.Get)(':id/customer-profile'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCustomerProfile", null);
__decorate([
    (0, common_1.Get)(':id/profile'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicProfile", null);
exports.UsersController = UsersController = UsersController_1 = __decorate([
    (0, common_1.Controller)('users'),
    __param(9, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(10, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(11, (0, typeorm_1.InjectRepository)(offer_entity_1.Offer)),
    __param(12, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        favorite_workers_service_1.FavoriteWorkersService,
        earnings_service_1.EarningsService,
        worker_insurance_service_1.WorkerInsuranceService,
        worker_certification_service_1.WorkerCertificationService,
        calendar_sync_service_1.CalendarSyncService,
        availability_service_1.AvailabilityService,
        admin_audit_service_1.AdminAuditService,
        data_privacy_service_1.DataPrivacyService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], UsersController);
//# sourceMappingURL=users.controller.js.map