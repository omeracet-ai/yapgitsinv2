import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { SemanticSearchService } from '../ai/semantic-search.service';
import { BoostService } from '../boost/boost.service';
import { BoostType } from '../boost/boost.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  encodeGeohash,
  geohashNeighbors,
  equirectangular,
  precisionForRadiusKm,
} from '../../common/geohash.util';
import { bayesianAverage, wilsonScore } from '../../common/rating.util';
import { tlToMinor } from '../../common/money.util';
import { Review } from '../reviews/review.entity';

export type StatField =
  | 'asCustomerTotal'
  | 'asCustomerSuccess'
  | 'asCustomerFail'
  | 'asWorkerTotal'
  | 'asWorkerSuccess'
  | 'asWorkerFail';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
    @InjectRepository(Review)
    private reviewsRepo: Repository<Review>,
    private readonly semanticSearch: SemanticSearchService,
    private readonly boostSvc: BoostService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /** Phase 146 — bulk planKey lookup helper exposed to controller. */
  async getActiveSubscriptionPlanKeys(userIds: string[]): Promise<Map<string, string>> {
    return this.subscriptionsService.getActiveByUserIds(userIds);
  }

  /** Phase 141 — Worker boost ranking: top_search_24h aktif olanları başa al. */
  private async _applyBoostRanking<T extends { id: string }>(items: T[]): Promise<T[]> {
    if (items.length === 0) return items;
    const map = await this.boostSvc.getActiveBoostsForRanking();
    if (map.size === 0) return items;
    const boosted: T[] = [];
    const rest: T[] = [];
    for (const it of items) {
      const types = map.get(it.id);
      if (types && types.has(BoostType.TOP_SEARCH_24H)) boosted.push(it);
      else rest.push(it);
    }
    return [...boosted, ...rest];
  }

  /** Phase 135 — Worker availability slots for next N days.
   * Combines weekly availabilitySchedule (Phase 44) + active bookings (Phase 70).
   * Public endpoint (no auth). fullyBooked = 8+ bookings/day (default 8 slots).
   */
  async getAvailabilitySlots(
    userId: string,
    days: number,
  ): Promise<Array<{
    date: string;
    dayOfWeek: string;
    weeklyAvailable: boolean;
    hasBooking: boolean;
    fullyBooked: boolean;
  }>> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
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
        st: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .getMany();

    const countByDate = new Map<string, number>();
    for (const b of bookings) {
      countByDate.set(b.scheduledDate, (countByDate.get(b.scheduledDate) ?? 0) + 1);
    }

    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    const sched = user.availabilitySchedule;
    const SLOTS_PER_DAY = 8;
    const out: Array<{
      date: string;
      dayOfWeek: string;
      weeklyAvailable: boolean;
      hasBooking: boolean;
      fullyBooked: boolean;
    }> = [];
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

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByPhone(phoneNumber: string): Promise<User | null> {
    return this.repo.findOne({ where: { phoneNumber } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findWorkers(category?: string, city?: string): Promise<User[]> {
    return this.findWorkersAdvanced({ category, city }).then((r) => r.data);
  }

  async findWorkersAdvanced(opts: {
    category?: string;
    city?: string;
    minRating?: number;
    minRate?: number;
    maxRate?: number;
    verifiedOnly?: boolean;
    availableOnly?: boolean;
    availableDay?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
    sortBy?: 'rating' | 'reputation' | 'rate_asc' | 'rate_desc' | 'nearest';
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    semanticQuery?: string;
  }): Promise<{
    data: (User & { distanceKm?: number })[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

    const qb = this.repo
      .createQueryBuilder('u')
      .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'");

    // availableOnly default true to preserve existing behavior unless explicitly false
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
      // null schedule = "her gün müsait"; aksi halde gün true olmalı
      qb.andWhere(
        '(u.availabilitySchedule IS NULL OR u.availabilitySchedule LIKE :dayPat)',
        { dayPat: `%"${opts.availableDay}":true%` },
      );
    }

    // Phase 173 — Top-rated sort uses wilsonScore first (statistically robust),
    // reputationScore as tiebreaker.
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

    // Phase 112 — Geo-fencing: lat/lng + radiusKm filter (SQLite-safe post-filter)
    const hasGeo =
      typeof opts.lat === 'number' &&
      typeof opts.lng === 'number' &&
      !isNaN(opts.lat) &&
      !isNaN(opts.lng);

    if (hasGeo || opts.sortBy === 'nearest') {
      // Fetch all matching, post-filter + sort, then paginate
      const all = await qb.getMany();
      const radiusKm = Math.min(200, Math.max(1, opts.radiusKm ?? 20));
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
      };

      let withDist: (User & { distanceKm?: number })[] = all.map((u) => {
        if (hasGeo && u.latitude != null && u.longitude != null) {
          const d = haversine(opts.lat!, opts.lng!, u.latitude, u.longitude);
          return Object.assign(u, { distanceKm: Math.round(d * 10) / 10 });
        }
        return Object.assign(u, { distanceKm: undefined });
      });

      if (hasGeo) {
        withDist = withDist.filter(
          (u) => u.distanceKm != null && u.distanceKm <= radiusKm,
        );
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

    // Phase 134 — Semantic re-rank: fetch all, rerank, then paginate
    if (opts.semanticQuery && this.semanticSearch.isEnabled()) {
      const all = await qb.getMany();
      let reranked = await this.semanticSearch.rerankWorkers(
        opts.semanticQuery,
        all,
      );
      reranked = await this._applyBoostRanking(reranked);
      const total = reranked.length;
      const slice = reranked.slice((page - 1) * limit, (page - 1) * limit + limit);
      return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
    }

    // Phase 141 — Boost ranking: fetch all, reorder, then paginate
    const boostMap = await this.boostSvc.getActiveBoostsForRanking();
    const hasTopBoost = Array.from(boostMap.values()).some((s) =>
      s.has(BoostType.TOP_SEARCH_24H),
    );
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

  create(userData: Partial<User>): Promise<User> {
    if (
      userData.latitude != null &&
      userData.longitude != null &&
      userData.homeGeohash == null
    ) {
      userData.homeGeohash =
        encodeGeohash(userData.latitude, userData.longitude, 6) || null;
    }
    return this.repo.save(this.repo.create(userData));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    if (data.latitude != null && data.longitude != null) {
      data.homeGeohash = encodeGeohash(data.latitude, data.longitude, 6) || null;
    }
    // Phase 174b — minor sync if hourlyRate fields changed
    if (data.hourlyRateMin !== undefined) {
      data.hourlyRateMinMinor = tlToMinor(data.hourlyRateMin);
    }
    if (data.hourlyRateMax !== undefined) {
      data.hourlyRateMaxMinor = tlToMinor(data.hourlyRateMax);
    }
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  /** Phase P191/4 (Voldi-sec) — bump tokenVersion to revoke all live JWTs. */
  async incrementTokenVersion(id: string): Promise<void> {
    await this.repo.increment({ id }, 'tokenVersion', 1);
  }

  /** Phase 60 — Hesap kendini deaktive eder (KVKK soft-delete) */
  async deactivateAccount(
    userId: string,
    password: string,
  ): Promise<{ deactivated: true; deactivatedAt: string }> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Şifre yanlış');
    }
    const deactivatedAt = new Date();
    await this.repo.update(userId, { deactivated: true, deactivatedAt });
    return { deactivated: true, deactivatedAt: deactivatedAt.toISOString() };
  }

  async bumpStat(userId: string, field: StatField): Promise<void> {
    await this.repo.increment({ id: userId }, field, 1);
  }

  /**
   * Phase 173 — Review eklendikten sonra rating + Wilson + reputation hesapla.
   * Tüm review'ları DB'den çekip Bayesian average + Wilson 95% CI lower bound üretir.
   * `averageRating` artık Bayesian-shrunk değer (UI/sıralama için).
   * `wilsonScore` = pozitif (>=4★) oranın güven aralığı alt sınırı (sıralama için).
   */
  async recalcRating(userId: string, _newRating?: number): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const reviews = await this.reviewsRepo.find({
      where: { revieweeId: userId },
      select: ['rating'],
    });
    const total = reviews.length;
    let sum = 0;
    let positive = 0;
    for (const r of reviews) {
      sum += r.rating;
      if (r.rating >= 4) positive++;
    }
    const bayesian = bayesianAverage(sum, total);
    const wilson = wilsonScore(positive, total);
    const reputation =
      Math.round(bayesian * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, {
      totalReviews: total,
      averageRating: Math.round(bayesian * 100) / 100,
      wilsonScore: Math.round(wilson * 10000) / 10000,
      reputationScore: reputation,
    });
  }

  /** Phase 44: haftalık müsaitlik takvimi — null = "her gün müsait" */
  async updateAvailability(
    userId: string,
    schedule: Record<string, unknown> | null | undefined,
  ): Promise<{ schedule: User['availabilitySchedule'] }> {
    if (schedule == null) {
      await this.repo.update(userId, { availabilitySchedule: null });
      return { schedule: null };
    }
    if (typeof schedule !== 'object' || Array.isArray(schedule)) {
      throw new BadRequestException('schedule bir nesne olmalı');
    }
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    const normalized = {} as Record<(typeof days)[number], boolean>;
    for (const d of days) {
      const v = (schedule as Record<string, unknown>)[d];
      if (typeof v !== 'boolean') {
        throw new BadRequestException(`schedule.${d} boolean olmalı`);
      }
      normalized[d] = v;
    }
    await this.repo.update(userId, { availabilitySchedule: normalized });
    return { schedule: normalized };
  }

  async updateLocation(id: string, latitude: number, longitude: number): Promise<void> {
    await this.repo.update(id, {
      latitude,
      longitude,
      homeGeohash: encodeGeohash(latitude, longitude, 6) || null,
      lastLocationAt: new Date().toISOString(),
    });
  }

  /**
   * Phase 177 — Geohash-indexed nearby workers.
   * Strategy:
   *   1. Encode query (lat,lon) at radius-appropriate precision.
   *   2. Build 9-cell prefix list (center + 8 neighbors).
   *   3. DB query: WHERE homeGeohash LIKE 'p%' OR LIKE 'q%' ... (uses index).
   *   4. Equirectangular distance + radius filter + sort in memory.
   * Speedup vs old getMany() + Haversine: O(n) -> O(k) where k ≈ rows-in-9-cells.
   */
  async findNearbyWorkers(opts: {
    lat: number;
    lon: number;
    radiusKm?: number;
    category?: string;
    verifiedOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: (User & { distanceKm: number })[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const radiusKm = Math.min(200, Math.max(1, opts.radiusKm ?? 20));
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const precision = precisionForRadiusKm(radiusKm);
    const center = encodeGeohash(opts.lat, opts.lon, precision);
    if (!center) {
      return { data: [], total: 0, page, limit, pages: 0 };
    }
    const cells = geohashNeighbors(center);
    const qb = this.repo
      .createQueryBuilder('u')
      .where("u.workerCategories IS NOT NULL AND u.workerCategories != '[]'")
      .andWhere('u.isAvailable = :av', { av: true })
      .andWhere('u.homeGeohash IS NOT NULL');
    qb.andWhere(
      '(' +
        cells
          .map((_, i) => `u.homeGeohash LIKE :h${i}`)
          .join(' OR ') +
        ')',
      Object.fromEntries(cells.map((c, i) => [`h${i}`, `${c}%`])),
    );
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
        const d = equirectangular(opts.lat, opts.lon, u.latitude!, u.longitude!);
        return Object.assign(u, { distanceKm: Math.round(d * 10) / 10 });
      })
      .filter(
        (u) =>
          u.distanceKm <= radiusKm &&
          // Respect worker's own service radius too
          u.distanceKm <= (u.serviceRadiusKm ?? 9999),
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);
    const total = annotated.length;
    const slice = annotated.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { data: slice, total, page, limit, pages: Math.ceil(total / limit) || 0 };
  }

  /** Phase 48: Profil doluluk yüzdesi — equal-weight 10 (müşteri) / 15 (usta) alan */
  private static readonly CUSTOMER_FIELDS: Array<{ key: string; check: (u: User) => boolean }> = [
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

  private static readonly WORKER_FIELDS: Array<{ key: string; check: (u: User) => boolean }> = [
    { key: 'workerCategories', check: (u) => Array.isArray(u.workerCategories) && u.workerCategories.length > 0 },
    { key: 'workerBio', check: (u) => !!u.workerBio },
    { key: 'hourlyRateMin', check: (u) => u.hourlyRateMin != null && u.hourlyRateMin > 0 },
    { key: 'hourlyRateMax', check: (u) => u.hourlyRateMax != null && u.hourlyRateMax > 0 },
    { key: 'availability', check: (u) => u.isAvailable === true || u.availabilitySchedule != null },
  ];

  computeProfileCompletion(user: User): {
    percent: number;
    missingFields: string[];
    totalFields: number;
    filledFields: number;
  } {
    const isWorker = !!(user.workerCategories && user.workerCategories.length > 0);
    const fields = isWorker
      ? [...UsersService.CUSTOMER_FIELDS, ...UsersService.WORKER_FIELDS]
      : UsersService.CUSTOMER_FIELDS;
    const missingFields: string[] = [];
    let filledFields = 0;
    for (const f of fields) {
      if (f.check(user)) filledFields++;
      else missingFields.push(f.key);
    }
    const totalFields = fields.length;
    const percent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    return { percent, missingFields, totalFields, filledFields };
  }

  /** Profile completion score (0-100) — non-worker users normalized over 70 */
  async getCompletionScore(userId: string): Promise<{
    score: number;
    missing: Array<{ field: string; label: string; points: number }>;
    isWorker: boolean;
  }> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return { score: 0, missing: [], isWorker: false };

    const isWorker = !!(user.workerCategories && user.workerCategories.length > 0);
    const checks: Array<{ field: string; label: string; points: number; ok: boolean }> = [
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
      checks.push(
        { field: 'workerBio', label: 'Hakkında / Bio', points: 10, ok: !!user.workerBio },
        { field: 'hourlyRate', label: 'Saatlik Ücret Aralığı', points: 10, ok: !!(user.hourlyRateMin && user.hourlyRateMax) },
        { field: 'serviceRadiusKm', label: 'Hizmet Yarıçapı', points: 5, ok: !!user.serviceRadiusKm },
        { field: 'isAvailable', label: 'Aktif Çalışma Durumu', points: 5, ok: !!user.isAvailable },
      );
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

  /** Phase 49 — notification preferences (null = all enabled) */
  async getNotificationPreferences(
    userId: string,
  ): Promise<{ preferences: User['notificationPreferences'] }> {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'notificationPreferences'],
    });
    return { preferences: user?.notificationPreferences ?? null };
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: Partial<NonNullable<User['notificationPreferences']>> | null,
  ): Promise<{ preferences: User['notificationPreferences'] }> {
    if (prefs == null) {
      await this.repo.update(userId, { notificationPreferences: null });
      return { preferences: null };
    }
    if (typeof prefs !== 'object' || Array.isArray(prefs)) {
      throw new BadRequestException('preferences bir nesne olmalı');
    }
    const keys = ['booking', 'offer', 'review', 'message', 'system'] as const;
    const normalized = {} as NonNullable<User['notificationPreferences']>;
    for (const k of keys) {
      const v = (prefs as Record<string, unknown>)[k];
      if (v != null && typeof v !== 'boolean') {
        throw new BadRequestException(`preferences.${k} boolean olmalı`);
      }
      normalized[k] = v == null ? true : (v as boolean);
    }
    await this.repo.update(userId, { notificationPreferences: normalized });
    return { preferences: normalized };
  }

  /** Phase 51 — worker offer templates (max 5, each up to 500 chars) */
  async getOfferTemplates(userId: string): Promise<{ templates: string[] }> {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'offerTemplates'],
    });
    return { templates: Array.isArray(user?.offerTemplates) ? user!.offerTemplates : [] };
  }

  async addOfferTemplate(
    userId: string,
    text: string,
  ): Promise<{ templates: string[] }> {
    const trimmed = (text ?? '').trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      throw new BadRequestException('text 1-500 karakter olmalı');
    }
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'offerTemplates'],
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.offerTemplates) ? user.offerTemplates : [];
    if (current.length >= 5) {
      throw new BadRequestException('En fazla 5 şablon eklenebilir');
    }
    const next = [...current, trimmed];
    await this.repo.update(userId, { offerTemplates: next });
    return { templates: next };
  }

  async removeOfferTemplate(
    userId: string,
    index: number,
  ): Promise<{ templates: string[] }> {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'offerTemplates'],
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.offerTemplates) ? user.offerTemplates : [];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      throw new NotFoundException('Geçersiz şablon indeksi');
    }
    const next = current.filter((_, i) => i !== index);
    await this.repo.update(userId, { offerTemplates: next.length ? next : null });
    return { templates: next };
  }

  /** Phase 138 — customer message templates (max 5, each up to 500 chars) */
  async getMessageTemplates(userId: string): Promise<{ templates: string[] }> {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'customerMessageTemplates'],
    });
    return { templates: Array.isArray(user?.customerMessageTemplates) ? user!.customerMessageTemplates : [] };
  }

  async addMessageTemplate(
    userId: string,
    text: string,
  ): Promise<{ templates: string[] }> {
    const trimmed = (text ?? '').trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      throw new BadRequestException('text 1-500 karakter olmalı');
    }
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'customerMessageTemplates'],
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.customerMessageTemplates) ? user.customerMessageTemplates : [];
    if (current.length >= 5) {
      throw new BadRequestException('En fazla 5 şablon eklenebilir');
    }
    const next = [...current, trimmed];
    await this.repo.update(userId, { customerMessageTemplates: next });
    return { templates: next };
  }

  async removeMessageTemplate(
    userId: string,
    index: number,
  ): Promise<{ templates: string[] }> {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'customerMessageTemplates'],
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.customerMessageTemplates) ? user.customerMessageTemplates : [];
    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      throw new NotFoundException('Geçersiz şablon indeksi');
    }
    const next = current.filter((_, i) => i !== index);
    await this.repo.update(userId, { customerMessageTemplates: next.length ? next : null });
    return { templates: next };
  }

  /** Phase 54: 6 auto-computed worker badges — embedded in user responses */
  static readonly BADGE_DEFINITIONS: ReadonlyArray<{
    key: 'verified' | 'top_rated' | 'prolific' | 'rising_star' | 'available_now' | 'complete_profile' | 'pro_member' | 'premium_member';
    label: string;
    icon: string;
  }> = [
    { key: 'verified',         label: 'Doğrulanmış',     icon: '✅' },
    { key: 'top_rated',        label: 'Üst Sıralama',    icon: '⭐' },
    { key: 'prolific',         label: 'Deneyimli',       icon: '🏆' },
    { key: 'rising_star',      label: 'Yükselen',        icon: '🌟' },
    { key: 'available_now',    label: 'Şu An Müsait',    icon: '🟢' },
    { key: 'complete_profile', label: 'Eksiksiz Profil', icon: '💯' },
    // Phase 146 — tier badges (auto-granted from subscription)
    { key: 'pro_member',       label: 'Pro Üye',         icon: '💎' },
    { key: 'premium_member',   label: 'Premium Üye',     icon: '👑' },
  ];

  /**
   * Phase 54 + 146: compute badge list ({key,label,icon}[]) for a user.
   * Async: subscription tier badges (Phase 146) require a DB lookup.
   * Optional `planKey` skips the lookup when caller already has it (bulk path).
   */
  async computeBadges(
    user: User,
    planKey?: string | null,
  ): Promise<Array<{ key: string; label: string; icon: string }>> {
    const earned = new Set<string>();
    if (user.identityVerified === true) earned.add('verified');
    if ((user.averageRating ?? 0) >= 4.5 && (user.totalReviews ?? 0) >= 10) earned.add('top_rated');
    if ((user.asWorkerSuccess ?? 0) >= 50) earned.add('prolific');
    const ws = user.asWorkerSuccess ?? 0;
    if (ws >= 5 && ws < 20 && (user.averageRating ?? 0) >= 4.0) earned.add('rising_star');
    if (user.isAvailable === true) earned.add('available_now');
    const completion = this.computeProfileCompletion(user);
    if (completion.percent === 100) earned.add('complete_profile');

    // Phase 146 — subscription tier → runtime badge
    let tierKey = planKey;
    if (tierKey === undefined) {
      tierKey = await this.subscriptionsService.getActivePlanKey(user.id);
    }
    if (tierKey === 'pro_monthly') earned.add('pro_member');
    else if (tierKey === 'premium_monthly') earned.add('premium_member');

    return UsersService.BADGE_DEFINITIONS.filter((b) => earned.has(b.key)).map((b) => ({
      key: b.key,
      label: b.label,
      icon: b.icon,
    }));
  }

  // ── Phase 113 — FCM device tokens (multi-device, max 5) ─────────────
  async addFcmToken(userId: string, token: string): Promise<string[]> {
    const trimmed = (token || '').trim();
    if (!trimmed) throw new BadRequestException('token gerekli');
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
    // Dedup + move-to-end so newest is preserved on overflow
    const next = [...current.filter((t) => t !== trimmed), trimmed];
    const trimmedList = next.slice(-5);
    await this.repo.update(userId, { fcmTokens: trimmedList });
    return trimmedList;
  }

  async removeFcmToken(userId: string, token: string): Promise<string[]> {
    const trimmed = (token || '').trim();
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    const current = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
    const next = current.filter((t) => t !== trimmed);
    await this.repo.update(userId, {
      fcmTokens: next.length ? next : null,
    });
    return next;
  }

  /**
   * Phase 173 — Stats güncellendikten sonra reputationScore'u yeniden hesapla.
   * `averageRating` zaten Bayesian-shrunk değer (recalcRating'te yazıldı), formül aynı.
   *   reputation = round(bayesianAvg × 20) + (customerSuccess + workerSuccess) × 5
   */
  async recalcReputation(userId: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const reputation =
      Math.round(user.averageRating * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, { reputationScore: reputation });
  }
}
