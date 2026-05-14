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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
const semantic_search_service_1 = require("../ai/semantic-search.service");
const boost_service_1 = require("../boost/boost.service");
const boost_entity_1 = require("../boost/boost.entity");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
const geohash_util_1 = require("../../common/geohash.util");
const rating_util_1 = require("../../common/rating.util");
const money_util_1 = require("../../common/money.util");
const review_entity_1 = require("../reviews/review.entity");
let UsersService = class UsersService {
    static { UsersService_1 = this; }
    repo;
    bookingsRepo;
    reviewsRepo;
    semanticSearch;
    boostSvc;
    subscriptionsService;
    constructor(repo, bookingsRepo, reviewsRepo, semanticSearch, boostSvc, subscriptionsService) {
        this.repo = repo;
        this.bookingsRepo = bookingsRepo;
        this.reviewsRepo = reviewsRepo;
        this.semanticSearch = semanticSearch;
        this.boostSvc = boostSvc;
        this.subscriptionsService = subscriptionsService;
    }
    async getActiveSubscriptionPlanKeys(userIds) {
        return this.subscriptionsService.getActiveByUserIds(userIds);
    }
    async _applyBoostRanking(items) {
        if (items.length === 0)
            return items;
        const map = await this.boostSvc.getActiveBoostsForRanking();
        if (map.size === 0)
            return items;
        const boosted = [];
        const rest = [];
        for (const it of items) {
            const types = map.get(it.id);
            if (types && types.has(boost_entity_1.BoostType.TOP_SEARCH_24H))
                boosted.push(it);
            else
                rest.push(it);
        }
        return [...boosted, ...rest];
    }
    async getAvailabilitySlots(userId, days) {
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const N = Math.min(90, Math.max(1, days || 30));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10);
        const endDate = new Date(today.getTime() + (N - 1) * 86400000);
        const endStr = endDate.toISOString().slice(0, 10);
        const bookings = await this.bookingsRepo
            .createQueryBuilder('b')
            .where('b.workerId = :uid', { uid: userId })
            .andWhere('b.scheduledDate >= :s', { s: todayStr })
            .andWhere('b.scheduledDate <= :e', { e: endStr })
            .andWhere('b.status IN (:...st)', {
            st: [booking_entity_1.BookingStatus.PENDING, booking_entity_1.BookingStatus.CONFIRMED, booking_entity_1.BookingStatus.IN_PROGRESS],
        })
            .getMany();
        const countByDate = new Map();
        for (const b of bookings) {
            countByDate.set(b.scheduledDate, (countByDate.get(b.scheduledDate) ?? 0) + 1);
        }
        const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const sched = user.availabilitySchedule;
        const SLOTS_PER_DAY = 8;
        const out = [];
        for (let i = 0; i < N; i++) {
            const d = new Date(today.getTime() + i * 86400000);
            const dateStr = d.toISOString().slice(0, 10);
            const dow = dayKeys[d.getDay()];
            const weeklyAvailable = sched == null ? true : sched[dow] === true;
            const cnt = countByDate.get(dateStr) ?? 0;
            out.push({
                date: dateStr,
                dayOfWeek: dow,
                weeklyAvailable,
                hasBooking: cnt > 0,
                fullyBooked: cnt >= SLOTS_PER_DAY,
            });
        }
        return out;
    }
    findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
    findByPhone(phoneNumber) {
        return this.repo.findOne({ where: { phoneNumber } });
    }
    findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    findAll() {
        return this.repo.find({ order: { createdAt: 'DESC' } });
    }
    findWorkers(category, city) {
        return this.findWorkersAdvanced({ category, city }).then((r) => r.data);
    }
    async findWorkersAdvanced(opts) {
        const page = Math.max(1, opts.page ?? 1);
        const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
        const qb = this.repo
            .createQueryBuilder('u')
            .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'");
        if (opts.availableOnly !== false) {
            qb.andWhere('u.isAvailable = :available', { available: true });
        }
        if (opts.category) {
            qb.andWhere('u.workerCategories LIKE :category', {
                category: `%"${opts.category}"%`,
            });
        }
        if (opts.city) {
            qb.andWhere('LOWER(u.city) LIKE :city', {
                city: `%${opts.city.toLowerCase()}%`,
            });
        }
        if (opts.minRating != null) {
            qb.andWhere('u.averageRating >= :minRating', { minRating: opts.minRating });
        }
        if (opts.minRate != null) {
            qb.andWhere('u.hourlyRateMin IS NOT NULL AND u.hourlyRateMin >= :minRate', {
                minRate: opts.minRate,
            });
        }
        if (opts.maxRate != null) {
            qb.andWhere('u.hourlyRateMax IS NOT NULL AND u.hourlyRateMax <= :maxRate', {
                maxRate: opts.maxRate,
            });
        }
        if (opts.verifiedOnly) {
            qb.andWhere('u.identityVerified = :verified', { verified: true });
        }
        if (opts.availableDay) {
            qb.andWhere('(u.availabilitySchedule IS NULL OR u.availabilitySchedule LIKE :dayPat)', { dayPat: `%"${opts.availableDay}":true%` });
        }
        switch (opts.sortBy) {
            case 'rating':
                qb.orderBy('u.wilsonScore', 'DESC')
                    .addOrderBy('u.averageRating', 'DESC')
                    .addOrderBy('u.reputationScore', 'DESC');
                break;
            case 'rate_asc':
                qb.orderBy('u.hourlyRateMin', 'ASC').addOrderBy('u.reputationScore', 'DESC');
                break;
            case 'rate_desc':
                qb.orderBy('u.hourlyRateMax', 'DESC').addOrderBy('u.reputationScore', 'DESC');
                break;
            case 'reputation':
            default:
                qb.orderBy('u.wilsonScore', 'DESC').addOrderBy('u.reputationScore', 'DESC');
                break;
        }
        const hasGeo = typeof opts.lat === 'number' &&
            typeof opts.lng === 'number' &&
            !isNaN(opts.lat) &&
            !isNaN(opts.lng);
        if (hasGeo || opts.sortBy === 'nearest') {
            const all = await qb.getMany();
            const radiusKm = Math.min(200, Math.max(1, opts.radiusKm ?? 20));
            let withDist = all.map((u) => {
                if (hasGeo && u.latitude != null && u.longitude != null) {
                    const d = (0, geohash_util_1.distKm)(opts.lat, opts.lng, u.latitude, u.longitude);
                    return Object.assign(u, { distanceKm: Math.round(d * 10) / 10 });
                }
                return Object.assign(u, { distanceKm: undefined });
            });
            if (hasGeo) {
                withDist = withDist.filter((u) => u.distanceKm != null && u.distanceKm <= radiusKm);
            }
            if (opts.sortBy === 'nearest') {
                withDist.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
            }
            let final = withDist;
            if (opts.semanticQuery && this.semanticSearch.isEnabled()) {
                final = await this.semanticSearch.rerankWorkers(opts.semanticQuery, final);
            }
            final = await this._applyBoostRanking(final);
            const total = final.length;
            const slice = final.slice((page - 1) * limit, (page - 1) * limit + limit);
            return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
        }
        if (opts.semanticQuery && this.semanticSearch.isEnabled()) {
            const all = await qb.getMany();
            let reranked = await this.semanticSearch.rerankWorkers(opts.semanticQuery, all);
            reranked = await this._applyBoostRanking(reranked);
            const total = reranked.length;
            const slice = reranked.slice((page - 1) * limit, (page - 1) * limit + limit);
            return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
        }
        const boostMap = await this.boostSvc.getActiveBoostsForRanking();
        const hasTopBoost = Array.from(boostMap.values()).some((s) => s.has(boost_entity_1.BoostType.TOP_SEARCH_24H));
        if (hasTopBoost) {
            const all = await qb.getMany();
            const ranked = await this._applyBoostRanking(all);
            const total = ranked.length;
            const slice = ranked.slice((page - 1) * limit, (page - 1) * limit + limit);
            return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
        }
        qb.skip((page - 1) * limit).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, pages: Math.ceil(total / limit) || 0 };
    }
    create(userData) {
        if (userData.latitude != null &&
            userData.longitude != null &&
            userData.homeGeohash == null) {
            userData.homeGeohash =
                (0, geohash_util_1.encodeGeohash)(userData.latitude, userData.longitude, 6) || null;
        }
        return this.repo.save(this.repo.create(userData));
    }
    async update(id, data) {
        if (data.latitude != null && data.longitude != null) {
            data.homeGeohash = (0, geohash_util_1.encodeGeohash)(data.latitude, data.longitude, 6) || null;
        }
        if (data.hourlyRateMin !== undefined) {
            data.hourlyRateMinMinor = (0, money_util_1.tlToMinor)(data.hourlyRateMin);
        }
        if (data.hourlyRateMax !== undefined) {
            data.hourlyRateMaxMinor = (0, money_util_1.tlToMinor)(data.hourlyRateMax);
        }
        await this.repo.update(id, data);
        return this.repo.findOne({ where: { id } });
    }
    async deleteById(id) {
        await this.repo.delete(id);
    }
    async incrementTokenVersion(id) {
        await this.repo.increment({ id }, 'tokenVersion', 1);
    }
    async deactivateAccount(userId, password) {
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Şifre yanlış');
        }
        const deactivatedAt = new Date();
        await this.repo.update(userId, { deactivated: true, deactivatedAt });
        return { deactivated: true, deactivatedAt: deactivatedAt.toISOString() };
    }
    async bumpStat(userId, field) {
        await this.repo.increment({ id: userId }, field, 1);
    }
    async recalcRating(userId, _newRating) {
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            return;
        const reviews = await this.reviewsRepo.find({
            where: { revieweeId: userId },
            select: ['rating'],
        });
        const total = reviews.length;
        let sum = 0;
        let positive = 0;
        for (const r of reviews) {
            sum += r.rating;
            if (r.rating >= 4)
                positive++;
        }
        const bayesian = (0, rating_util_1.bayesianAverage)(sum, total);
        const wilson = (0, rating_util_1.wilsonScore)(positive, total);
        const reputation = Math.round(bayesian * 20) +
            (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
        await this.repo.update(userId, {
            totalReviews: total,
            averageRating: Math.round(bayesian * 100) / 100,
            wilsonScore: Math.round(wilson * 10000) / 10000,
            reputationScore: reputation,
        });
    }
    async updateAvailability(userId, schedule) {
        if (schedule == null) {
            await this.repo.update(userId, { availabilitySchedule: null });
            return { schedule: null };
        }
        if (typeof schedule !== 'object' || Array.isArray(schedule)) {
            throw new common_1.BadRequestException('schedule bir nesne olmalı');
        }
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const normalized = {};
        for (const d of days) {
            const v = schedule[d];
            if (typeof v !== 'boolean') {
                throw new common_1.BadRequestException(`schedule.${d} boolean olmalı`);
            }
            normalized[d] = v;
        }
        await this.repo.update(userId, { availabilitySchedule: normalized });
        return { schedule: normalized };
    }
    async updateLocation(id, latitude, longitude) {
        await this.repo.update(id, {
            latitude,
            longitude,
            homeGeohash: (0, geohash_util_1.encodeGeohash)(latitude, longitude, 6) || null,
            lastLocationAt: new Date().toISOString(),
        });
    }
    async findNearbyWorkers(opts) {
        const radiusKm = Math.min(200, Math.max(1, opts.radiusKm ?? 20));
        const page = Math.max(1, opts.page ?? 1);
        const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
        const precision = (0, geohash_util_1.precisionForRadiusKm)(radiusKm);
        const center = (0, geohash_util_1.encodeGeohash)(opts.lat, opts.lon, precision);
        if (!center) {
            return { data: [], total: 0, page, limit, pages: 0 };
        }
        const cells = (0, geohash_util_1.geohashNeighbors)(center);
        const qb = this.repo
            .createQueryBuilder('u')
            .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'")
            .andWhere('u.isAvailable = :av', { av: true })
            .andWhere('u.homeGeohash IS NOT NULL');
        qb.andWhere('(' +
            cells
                .map((_, i) => `u.homeGeohash LIKE :h${i}`)
                .join(' OR ') +
            ')', Object.fromEntries(cells.map((c, i) => [`h${i}`, `${c}%`])));
        if (opts.category) {
            qb.andWhere('u.workerCategories LIKE :category', {
                category: `%"${opts.category}"%`,
            });
        }
        if (opts.verifiedOnly) {
            qb.andWhere('u.identityVerified = :v', { v: true });
        }
        const candidates = await qb.getMany();
        const annotated = candidates
            .filter((u) => u.latitude != null && u.longitude != null)
            .map((u) => {
            const d = (0, geohash_util_1.equirectangular)(opts.lat, opts.lon, u.latitude, u.longitude);
            return Object.assign(u, { distanceKm: Math.round(d * 10) / 10 });
        })
            .filter((u) => u.distanceKm <= radiusKm &&
            u.distanceKm <= (u.serviceRadiusKm ?? 9999))
            .sort((a, b) => a.distanceKm - b.distanceKm);
        const total = annotated.length;
        const slice = annotated.slice((page - 1) * limit, (page - 1) * limit + limit);
        return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
    }
    static CUSTOMER_FIELDS = [
        { key: 'fullName', check: (u) => !!u.fullName },
        { key: 'phoneNumber', check: (u) => !!u.phoneNumber },
        { key: 'email', check: (u) => !!u.email },
        { key: 'profileImageUrl', check: (u) => !!u.profileImageUrl },
        { key: 'identityPhotoUrl', check: (u) => !!u.identityPhotoUrl },
        { key: 'identityVerified', check: (u) => u.identityVerified === true },
        { key: 'birthDate', check: (u) => !!u.birthDate },
        { key: 'gender', check: (u) => !!u.gender },
        { key: 'city', check: (u) => !!u.city },
        { key: 'district', check: (u) => !!u.district },
    ];
    static WORKER_FIELDS = [
        { key: 'workerCategories', check: (u) => Array.isArray(u.workerCategories) && u.workerCategories.length > 0 },
        { key: 'workerBio', check: (u) => !!u.workerBio },
        { key: 'hourlyRateMin', check: (u) => u.hourlyRateMin != null && u.hourlyRateMin > 0 },
        { key: 'hourlyRateMax', check: (u) => u.hourlyRateMax != null && u.hourlyRateMax > 0 },
        { key: 'availability', check: (u) => u.isAvailable === true || u.availabilitySchedule != null },
    ];
    computeProfileCompletion(user) {
        const isWorker = !!(user.workerCategories && user.workerCategories.length > 0);
        const fields = isWorker
            ? [...UsersService_1.CUSTOMER_FIELDS, ...UsersService_1.WORKER_FIELDS]
            : UsersService_1.CUSTOMER_FIELDS;
        const missingFields = [];
        let filledFields = 0;
        for (const f of fields) {
            if (f.check(user))
                filledFields++;
            else
                missingFields.push(f.key);
        }
        const totalFields = fields.length;
        const percent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
        return { percent, missingFields, totalFields, filledFields };
    }
    async getCompletionScore(userId) {
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            return { score: 0, missing: [], isWorker: false };
        const isWorker = !!(user.workerCategories && user.workerCategories.length > 0);
        const checks = [
            { field: 'fullName', label: 'Ad Soyad', points: 10, ok: !!user.fullName },
            { field: 'phoneNumber', label: 'Telefon Numarası', points: 10, ok: !!user.phoneNumber },
            { field: 'email', label: 'E-posta', points: 10, ok: !!user.email },
            { field: 'profileImageUrl', label: 'Profil Fotoğrafı', points: 10, ok: !!user.profileImageUrl },
            { field: 'birthDate', label: 'Doğum Tarihi', points: 5, ok: !!user.birthDate },
            { field: 'city', label: 'Şehir', points: 5, ok: !!user.city },
            { field: 'identityPhotoUrl', label: 'Kimlik Fotoğrafı', points: 10, ok: !!user.identityPhotoUrl },
            { field: 'identityVerified', label: 'Kimlik Doğrulama', points: 10, ok: !!user.identityVerified },
        ];
        if (isWorker) {
            checks.push({ field: 'workerBio', label: 'Hakkında / Bio', points: 10, ok: !!user.workerBio }, { field: 'hourlyRate', label: 'Saatlik Ücret Aralığı', points: 10, ok: !!(user.hourlyRateMin && user.hourlyRateMax) }, { field: 'serviceRadiusKm', label: 'Hizmet Yarıçapı', points: 5, ok: !!user.serviceRadiusKm }, { field: 'isAvailable', label: 'Aktif Çalışma Durumu', points: 5, ok: !!user.isAvailable });
        }
        const maxPoints = checks.reduce((s, c) => s + c.points, 0);
        const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.points, 0);
        const score = Math.round((earned / maxPoints) * 100);
        const missing = checks
            .filter((c) => !c.ok)
            .map(({ field, label, points }) => ({ field, label, points }))
            .sort((a, b) => b.points - a.points);
        return { score, missing, isWorker };
    }
    async getNotificationPreferences(userId) {
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'notificationPreferences'],
        });
        return { preferences: user?.notificationPreferences ?? null };
    }
    async updateNotificationPreferences(userId, prefs) {
        if (prefs == null) {
            await this.repo.update(userId, { notificationPreferences: null });
            return { preferences: null };
        }
        if (typeof prefs !== 'object' || Array.isArray(prefs)) {
            throw new common_1.BadRequestException('preferences bir nesne olmalı');
        }
        const keys = ['booking', 'offer', 'review', 'message', 'system'];
        const normalized = {};
        for (const k of keys) {
            const v = prefs[k];
            if (v != null && typeof v !== 'boolean') {
                throw new common_1.BadRequestException(`preferences.${k} boolean olmalı`);
            }
            normalized[k] = v == null ? true : v;
        }
        await this.repo.update(userId, { notificationPreferences: normalized });
        return { preferences: normalized };
    }
    async getOfferTemplates(userId) {
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'offerTemplates'],
        });
        return { templates: Array.isArray(user?.offerTemplates) ? user.offerTemplates : [] };
    }
    async addOfferTemplate(userId, text) {
        const trimmed = (text ?? '').trim();
        if (trimmed.length < 1 || trimmed.length > 500) {
            throw new common_1.BadRequestException('text 1-500 karakter olmalı');
        }
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'offerTemplates'],
        });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.offerTemplates) ? user.offerTemplates : [];
        if (current.length >= 5) {
            throw new common_1.BadRequestException('En fazla 5 şablon eklenebilir');
        }
        const next = [...current, trimmed];
        await this.repo.update(userId, { offerTemplates: next });
        return { templates: next };
    }
    async removeOfferTemplate(userId, index) {
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'offerTemplates'],
        });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.offerTemplates) ? user.offerTemplates : [];
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
            throw new common_1.NotFoundException('Geçersiz şablon indeksi');
        }
        const next = current.filter((_, i) => i !== index);
        await this.repo.update(userId, { offerTemplates: next.length ? next : null });
        return { templates: next };
    }
    async getMessageTemplates(userId) {
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'customerMessageTemplates'],
        });
        return { templates: Array.isArray(user?.customerMessageTemplates) ? user.customerMessageTemplates : [] };
    }
    async addMessageTemplate(userId, text) {
        const trimmed = (text ?? '').trim();
        if (trimmed.length < 1 || trimmed.length > 500) {
            throw new common_1.BadRequestException('text 1-500 karakter olmalı');
        }
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'customerMessageTemplates'],
        });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.customerMessageTemplates) ? user.customerMessageTemplates : [];
        if (current.length >= 5) {
            throw new common_1.BadRequestException('En fazla 5 şablon eklenebilir');
        }
        const next = [...current, trimmed];
        await this.repo.update(userId, { customerMessageTemplates: next });
        return { templates: next };
    }
    async removeMessageTemplate(userId, index) {
        const user = await this.repo.findOne({
            where: { id: userId },
            select: ['id', 'customerMessageTemplates'],
        });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.customerMessageTemplates) ? user.customerMessageTemplates : [];
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
            throw new common_1.NotFoundException('Geçersiz şablon indeksi');
        }
        const next = current.filter((_, i) => i !== index);
        await this.repo.update(userId, { customerMessageTemplates: next.length ? next : null });
        return { templates: next };
    }
    static BADGE_DEFINITIONS = [
        { key: 'verified', label: 'Doğrulanmış', icon: '✅' },
        { key: 'top_rated', label: 'Üst Sıralama', icon: '⭐' },
        { key: 'prolific', label: 'Deneyimli', icon: '🏆' },
        { key: 'rising_star', label: 'Yükselen', icon: '🌟' },
        { key: 'available_now', label: 'Şu An Müsait', icon: '🟢' },
        { key: 'complete_profile', label: 'Eksiksiz Profil', icon: '💯' },
        { key: 'pro_member', label: 'Pro Üye', icon: '💎' },
        { key: 'premium_member', label: 'Premium Üye', icon: '👑' },
    ];
    async computeBadges(user, planKey) {
        const earned = new Set();
        if (user.identityVerified === true)
            earned.add('verified');
        if ((user.averageRating ?? 0) >= 4.5 && (user.totalReviews ?? 0) >= 10)
            earned.add('top_rated');
        if ((user.asWorkerSuccess ?? 0) >= 50)
            earned.add('prolific');
        const ws = user.asWorkerSuccess ?? 0;
        if (ws >= 5 && ws < 20 && (user.averageRating ?? 0) >= 4.0)
            earned.add('rising_star');
        if (user.isAvailable === true)
            earned.add('available_now');
        const completion = this.computeProfileCompletion(user);
        if (completion.percent === 100)
            earned.add('complete_profile');
        let tierKey = planKey;
        if (tierKey === undefined) {
            tierKey = await this.subscriptionsService.getActivePlanKey(user.id);
        }
        if (tierKey === 'pro_monthly')
            earned.add('pro_member');
        else if (tierKey === 'premium_monthly')
            earned.add('premium_member');
        return UsersService_1.BADGE_DEFINITIONS.filter((b) => earned.has(b.key)).map((b) => ({
            key: b.key,
            label: b.label,
            icon: b.icon,
        }));
    }
    async addFcmToken(userId, token) {
        const trimmed = (token || '').trim();
        if (!trimmed)
            throw new common_1.BadRequestException('token gerekli');
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
        const next = [...current.filter((t) => t !== trimmed), trimmed];
        const trimmedList = next.slice(-5);
        await this.repo.update(userId, { fcmTokens: trimmedList });
        return trimmedList;
    }
    async removeFcmToken(userId, token) {
        const trimmed = (token || '').trim();
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const current = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
        const next = current.filter((t) => t !== trimmed);
        await this.repo.update(userId, {
            fcmTokens: next.length ? next : null,
        });
        return next;
    }
    async recalcReputation(userId) {
        const user = await this.repo.findOne({ where: { id: userId } });
        if (!user)
            return;
        const reputation = Math.round(user.averageRating * 20) +
            (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
        await this.repo.update(userId, { reputationScore: reputation });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(2, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => subscriptions_service_1.SubscriptionsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        semantic_search_service_1.SemanticSearchService,
        boost_service_1.BoostService,
        subscriptions_service_1.SubscriptionsService])
], UsersService);
//# sourceMappingURL=users.service.js.map