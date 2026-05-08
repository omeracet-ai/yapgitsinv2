import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
  ) {}

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
    sortBy?: 'rating' | 'reputation' | 'rate_asc' | 'rate_desc';
    page?: number;
    limit?: number;
  }): Promise<{
    data: User[];
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

    switch (opts.sortBy) {
      case 'rating':
        qb.orderBy('u.averageRating', 'DESC').addOrderBy('u.reputationScore', 'DESC');
        break;
      case 'rate_asc':
        qb.orderBy('u.hourlyRateMin', 'ASC').addOrderBy('u.reputationScore', 'DESC');
        break;
      case 'rate_desc':
        qb.orderBy('u.hourlyRateMax', 'DESC').addOrderBy('u.reputationScore', 'DESC');
        break;
      case 'reputation':
      default:
        qb.orderBy('u.reputationScore', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) || 0 };
  }

  create(userData: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(userData));
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async bumpStat(userId: string, field: StatField): Promise<void> {
    await this.repo.increment({ id: userId }, field, 1);
  }

  /** Review eklendikten sonra averageRating, totalReviews ve reputationScore'u güncelle */
  async recalcRating(userId: string, newRating: number): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const total = user.totalReviews + 1;
    const average =
      (user.averageRating * user.totalReviews + newRating) / total;
    // reputationScore: puan ortalaması × 20 + başarılı iş sayısı × 5
    const reputation =
      Math.round(average * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, {
      totalReviews: total,
      averageRating: Math.round(average * 100) / 100,
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
      lastLocationAt: new Date().toISOString(),
    });
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

  /** Stats güncellendikten sonra reputationScore'u yeniden hesapla */
  async recalcReputation(userId: string): Promise<void> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) return;
    const reputation =
      Math.round(user.averageRating * 20) +
      (user.asCustomerSuccess + user.asWorkerSuccess) * 5;
    await this.repo.update(userId, { reputationScore: reputation });
  }
}
