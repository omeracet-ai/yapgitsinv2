import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import { Job, JobStatus, JobKind, isValidTransition } from './job.entity';
import { Offer, OfferStatus } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { TokensService } from '../tokens/tokens.service';
// Phase 245 — boost atomic transaction için doğrudan entity importları.
import { User, UserRole } from '../users/user.entity';
import {
  TokenTransaction,
  TxType,
  TxStatus,
} from '../tokens/token-transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowStatus } from '../escrow/payment-escrow.entity';
import { CancellationService } from '../cancellation/cancellation.service';
import { DisputesService } from '../disputes/disputes.service';
import { DisputeType } from '../disputes/job-dispute.entity';
import { FraudDetectionService } from '../ai/fraud-detection.service';
import { CategorySubscriptionsService } from '../subscriptions/category-subscriptions.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { encodeGeohash } from '../../common/geohash.util';
import { tlToMinor } from '../../common/money.util';
import { join } from 'path';
import { APP_ROOT } from '../../common/paths';
import * as fs from 'fs';
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
const sharp = require('sharp');

// Geçerli UUID — SQLite ve PostgreSQL uyumlu sabit seed kimliği
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

export const BOOST_TOKEN_COST_PER_DAY = 10;
export const BOOST_ALLOWED_DAYS = [3, 7, 14] as const;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    // Phase 259 — read-only admin lookup for fraud-flag notifications.
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private usersService: UsersService,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private escrowService: EscrowService,
    private cancellationService: CancellationService,
    private disputesService: DisputesService,
    private tokensService: TokensService,
    private fraudDetection: FraudDetectionService,
    private categorySubsService: CategorySubscriptionsService,
    private systemSettings: SystemSettingsService,
  ) {}

  /**
   * Phase 143 — Yeni job için category+city subscription'ları match'le ve notify et.
   * Fire-and-forget; hata API response'unu bloklamaz.
   */
  private async _notifyCategorySubscribers(job: Job): Promise<void> {
    try {
      const matches = await this.categorySubsService.findMatches(
        job.category,
        job.location,
      );
      for (const sub of matches) {
        if (sub.userId === job.customerId) continue; // ilan sahibine gönderme
        await this.notificationsService.send({
          userId: sub.userId,
          type: NotificationType.SYSTEM,
          title: 'Aradığın iş geldi',
          body: `${job.category} kategorisinde yeni ilan: ${job.title}`,
          relatedType: 'job',
          relatedId: job.id,
        });
        await this.categorySubsService.markNotified(sub.id);
      }
    } catch (e) {
      this.logger.warn(`category subscription notify failed: ${String(e)}`);
    }
  }

  /**
   * Phase 259 — notify admins when a job is auto-flagged as high fraud risk.
   *
   * SAFETY: best-effort, fully self-contained. Wrapped in try/catch so a failed
   * admin lookup or notification insert can NEVER break or delay job creation —
   * it is only ever invoked from a fire-and-forget (.then) chain that itself has
   * an outer .catch(). Errors are swallowed with a logger.warn, matching the
   * fraud hook + _notifyCategorySubscribers conventions.
   */
  private async _notifyAdminsOfFraudFlag(
    job: Pick<Job, 'id' | 'title'>,
    score: number,
    reason: string,
  ): Promise<void> {
    try {
      const admins = await this.usersRepository.find({
        where: { role: In([UserRole.ADMIN, UserRole.SUPER_ADMIN]) },
        select: ['id'],
      });
      if (admins.length === 0) {
        this.logger.warn(
          `Job ${job.id} flagged (score=${score}) but no admin found to notify`,
        );
        return;
      }
      const title = '🚩 Şüpheli ilan';
      const body = `"${job.title}" yüksek risk olarak işaretlendi (skor: ${score}). Sebep: ${reason || 'belirtilmedi'}`;
      for (const admin of admins) {
        // send() is best-effort per-recipient; guard each so one failure
        // doesn't skip the remaining admins.
        try {
          await this.notificationsService.send({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title,
            body,
            refId: job.id,
            relatedType: 'job',
            relatedId: job.id,
          });
        } catch (inner) {
          this.logger.warn(
            `Admin fraud-flag notify failed for admin ${admin.id} (job ${job.id}): ${String(inner)}`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        `Admin fraud-flag notify failed for job ${job.id}: ${String(e)}`,
      );
    }
  }

  /**
   * Phase 245 (Voldi-sec) — boost atomic transaction.
   *
   * Eski pattern:
   *   1. tokensService.spend(userId, cost) → User.tokenBalance UPDATE + tx log
   *      (kendi içinde atomik decrement)
   *   2. MAX(featuredOrder) sorgu
   *   3. job.featuredOrder = N+1; jobsRepository.save(job)
   *
   * Risk: 1 başarılı, 3 patladı (DB hatası, schema drift, network) → token
   * gitmiş, boost yok. PARA AKIŞI KAYBI. Audit P2 ama kullanıcı geri ödeme
   * talebi → support yükü + güven kaybı, P1'e yükseltildi.
   *
   * Fix: dataSource.transaction içinde inline atomic decrement (TokenTransaction
   * log + Job update aynı transaction'da). Save fail → rollback → token iade.
   * Phase 242 atomic decrement pattern'i takip eder (TokensService.spend ile aynı
   * UPDATE shape — manager üzerinden çalışır).
   */
  async boost(jobId: string, days: number, userId: string): Promise<Job> {
    if (
      !BOOST_ALLOWED_DAYS.includes(days as (typeof BOOST_ALLOWED_DAYS)[number])
    ) {
      throw new BadRequestException('Geçersiz süre — 3, 7 veya 14 gün');
    }
    const cost = days * BOOST_TOKEN_COST_PER_DAY;

    return this.dataSource.transaction(async (manager) => {
      // 1. Ownership + existence kontrolü transaction içinde (race korumalı).
      const job = await manager.findOne(Job, { where: { id: jobId } });
      if (!job) throw new NotFoundException('İlan bulunamadı');
      if (job.customerId !== userId) {
        throw new ForbiddenException('Bu ilan size ait değil');
      }

      // 2. Atomic conditional decrement — Phase 242 pattern.
      // affected=0 → yetersiz bakiye → BadRequestException → rollback.
      const tokenResult = await manager
        .createQueryBuilder()
        .update(User)
        .set({ tokenBalance: () => 'tokenBalance - :cost' })
        .where('id = :id AND tokenBalance >= :cost', { id: userId, cost })
        .execute();
      if (!tokenResult.affected) {
        const u = await manager.findOne(User, { where: { id: userId } });
        throw new BadRequestException(
          `Yetersiz kredi bakiyesi. Gerekli: ${cost}, Mevcut: ${u?.tokenBalance ?? 0}`,
        );
      }

      // 3. TokenTransaction log — transaction içinde, rollback'e dahil.
      await manager.save(
        manager.create(TokenTransaction, {
          userId,
          type: TxType.SPEND,
          amount: cost,
          amountMinor: cost * 100,
          description: `İlan boost (${days} gün)`,
          status: TxStatus.COMPLETED,
          paymentMethod: null,
          paymentRef: null,
        }),
      );

      // 4. featuredOrder = MAX+1 transaction içinde, job UPDATE'i ile beraber.
      const maxRow = await manager
        .createQueryBuilder(Job, 'job')
        .select('MAX(job.featuredOrder)', 'max')
        .getRawOne<{ max: number | null }>();
      const nextOrder = (maxRow?.max ?? 0) + 1;

      job.featuredOrder = nextOrder;
      job.featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return manager.save(Job, job);
    });
  }

  async onModuleInit() {
    // Örnek veri (seed kullanıcı + demo ilanlar) yalnızca ALLOW_SEED=1 iken eklenir.
    // Aksi halde veri temizliği sonrası bir restart, boş `jobs` tablosunu görüp
    // demo ilanları + seed@yapgitsin.tr kullanıcısını geri ekler ve temizliği bozardı.
    // admin-seed ile aynı konvansiyon (ALLOW_SEED === '1').
    if (process.env.ALLOW_SEED !== '1') return;

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
          budgetMinMinor: tlToMinor(500),
          budgetMaxMinor: tlToMinor(1500),
          status: JobStatus.OPEN,
          customerId: userId,
        },
        {
          title: 'Mutfak Musluk Tamiri',
          description:
            'Musluk su kaçırıyor, conta değişimi veya yenileme gerek.',
          category: 'Tesisat',
          location: 'Beşiktaş, İstanbul',
          budgetMin: 100,
          budgetMax: 300,
          budgetMinMinor: tlToMinor(100),
          budgetMaxMinor: tlToMinor(300),
          status: JobStatus.OPEN,
          customerId: userId,
        },
        {
          title: 'Haftalık Ev Temizliği',
          description: 'Her Cuma günü rutin ev temizliği yapılacak.',
          category: 'Temizlik',
          location: 'Üsküdar, İstanbul',
          budgetMin: 800,
          budgetMax: 1200,
          budgetMinMinor: tlToMinor(800),
          budgetMaxMinor: tlToMinor(1200),
          status: JobStatus.OPEN,
          customerId: userId,
        },
        // Phase Two-Sided — kind='offer' demo hizmet ilanları (usta tarafı)
        {
          title: 'Profesyonel Klima Bakımı',
          description:
            'Split klima genel bakımı, gaz dolumu, derin temizlik. 1 yıl garanti.',
          category: 'Klima Servis',
          location: 'Kadıköy, İstanbul',
          budgetMin: 350,
          budgetMax: 600,
          budgetMinMinor: tlToMinor(350),
          budgetMaxMinor: tlToMinor(600),
          status: JobStatus.OPEN,
          customerId: userId,
          kind: JobKind.OFFER,
        },
        {
          title: 'Ev Boyama — Tüm Daire',
          description:
            '3+1 daire iç boya, malzeme dahil. 2-3 günde teslim, temiz çalışma garantili.',
          category: 'Boya & Badana',
          location: 'Şişli, İstanbul',
          budgetMin: 4500,
          budgetMax: 7000,
          budgetMinMinor: tlToMinor(4500),
          budgetMaxMinor: tlToMinor(7000),
          status: JobStatus.OPEN,
          customerId: userId,
          kind: JobKind.OFFER,
        },
        {
          title: 'Acil Tesisat Servisi',
          description:
            '7/24 acil su kaçağı, tıkanıklık, kombi servisi. 30 dk içinde lokal.',
          category: 'Tesisat',
          location: 'Beşiktaş, İstanbul',
          budgetMin: 200,
          budgetMax: 500,
          budgetMinMinor: tlToMinor(200),
          budgetMaxMinor: tlToMinor(500),
          status: JobStatus.OPEN,
          customerId: userId,
          kind: JobKind.OFFER,
        },
      ]);
    }
  }

  async findAll(filters?: {
    category?: string;
    status?: JobStatus;
    limit?: number;
    page?: number;
    customerId?: string;
    q?: string;
    kind?: JobKind;
    lat?: number;
    lng?: number;
  }) {
    const limit = filters?.limit ?? 20;
    const page = filters?.page ?? 1;

    // Phase 243 — defensive guard: public homepage feed must never 500 on
    // stale-schema / NULL-relation / migration-drift conditions in prod.
    try {
      const query = this.jobsRepository.createQueryBuilder('job');

      if (filters?.category) {
        query.andWhere('job.category = :category', {
          category: filters.category,
        });
      }
      if (filters?.status) {
        query.andWhere('job.status = :status', { status: filters.status });
      }
      if (filters?.customerId) {
        query.andWhere('job.customerId = :customerId', {
          customerId: filters.customerId,
        });
      } else {
        // Phase 279c — Profile-card'tan açılan özel ilanlar (targetWorkerId
        // set) public listingde GÖRÜNMEZ. Sadece müşteri kendi listesinde
        // (?customerId=me) ve targetWorker /jobs/my-offers'ta görür.
        query.andWhere('job.targetWorkerId IS NULL');
      }
      // Phase Two-Sided — request/offer ayrımı
      if (filters?.kind) {
        query.andWhere('job.kind = :kind', { kind: filters.kind });
      }
      if (filters?.q && filters.q.trim().length > 0) {
        const q = `%${filters.q.trim().toLowerCase()}%`;
        query.andWhere(
          '(LOWER(job.title) LIKE :q OR LOWER(job.description) LIKE :q)',
          { q },
        );
      }

      // Sıralama: 1) "Öne Çıkan" (boost/featured) en üstte, 2) kullanıcı
      // konumu verildiyse en yakın ilan, 3) en yeni. Konum yoksa eski davranış.
      query
        .orderBy(
          'CASE WHEN job.featuredOrder IS NOT NULL THEN 0 ELSE 1 END',
          'ASC',
        )
        .addOrderBy('job.featuredOrder', 'ASC');

      const hasGeo =
        filters?.lat != null &&
        filters?.lng != null &&
        !Number.isNaN(filters.lat) &&
        !Number.isNaN(filters.lng);
      if (hasGeo) {
        // Koordinatsız ilanlar en sona; koordinatlılar Haversine mesafesine göre
        // (km) artan sırada. Math fonksiyonları /jobs/nearby ile aynı (prod'da
        // çalışıyor: Postgres native, SQLite math-functions etkin).
        query
          .addOrderBy(
            'CASE WHEN job.latitude IS NULL OR job.longitude IS NULL THEN 1 ELSE 0 END',
            'ASC',
          )
          .addOrderBy(
            `(6371 * acos(
              cos(radians(:ulat)) * cos(radians(job.latitude)) *
              cos(radians(job.longitude) - radians(:ulng)) +
              sin(radians(:ulat)) * sin(radians(job.latitude))
            ))`,
            'ASC',
          )
          .setParameters({ ulat: filters.lat, ulng: filters.lng });
      }

      query
        .addOrderBy('job.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await query.getManyAndCount();
      await this._attachPosters(data);
      // Phase 265e — offerCount herkese açık: logout user da kart üzerinde
      // teklif sayısını görür (badge pasif kalmaz).
      await this._attachOfferCounts(data);
      return { data, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `findAll(${JSON.stringify(filters ?? {})}) failed: ${e?.message ?? String(err)}`,
        e?.stack,
      );
      return { data: [], total: 0, page, limit, pages: 0 };
    }
  }

  /**
   * Liste kartlarına ilan sahibinin kompakt profilini ekler (avatar, puan,
   * itibar/derece, başarı oranı). Tek batch sorgu — N+1 yok. Best-effort:
   * hata olursa liste yine döner, sadece poster eksik kalır.
   */
  private async _attachPosters(jobs: Job[]): Promise<void> {
    try {
      const ids = [
        ...new Set(
          jobs.map((j) => j.customerId).filter((x): x is string => !!x),
        ),
      ];
      if (ids.length === 0) return;
      const users = await this.usersRepository.find({
        where: { id: In(ids) },
        select: [
          'id',
          'fullName',
          'profileImageUrl',
          'averageRating',
          'totalReviews',
          'reputationScore',
          'asWorkerTotal',
          'asWorkerSuccess',
          'identityVerified',
        ],
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      for (const job of jobs) {
        const u = job.customerId ? byId.get(job.customerId) : undefined;
        if (!u) continue;
        (job as Job & { poster?: Record<string, unknown> }).poster = {
          id: u.id,
          fullName: u.fullName,
          profileImageUrl: u.profileImageUrl ?? null,
          averageRating: u.averageRating ?? 0,
          totalReviews: u.totalReviews ?? 0,
          reputationScore: u.reputationScore ?? 0,
          asWorkerTotal: u.asWorkerTotal ?? 0,
          asWorkerSuccess: u.asWorkerSuccess ?? 0,
          identityVerified: u.identityVerified ?? false,
        };
      }
    } catch (e) {
      this.logger.warn(`_attachPosters failed: ${(e as Error).message}`);
    }
  }

  /**
   * Phase 265e — Her job için root-only PENDING/COUNTERED offer sayısını
   * tek batch sorguyla çıkarıp `(job as any).offerCount = N` yazar.
   * Public listede çıkıyor → logout user da Yapgitsin kartlarında badge görür.
   */
  private async _attachOfferCounts(jobs: Job[]): Promise<void> {
    try {
      const ids = jobs.map((j) => j.id);
      if (ids.length === 0) return;
      const rows = await this.offersRepository
        .createQueryBuilder('o')
        .select('o.jobId', 'jobId')
        .addSelect('COUNT(*)', 'cnt')
        .where('o.jobId IN (:...ids)', { ids })
        .andWhere('o.parentOfferId IS NULL')
        .andWhere('o.status IN (:...active)', {
          active: ['pending', 'countered', 'accepted'],
        })
        .groupBy('o.jobId')
        .getRawMany<{ jobId: string; cnt: string }>();
      const byId = new Map(rows.map((r) => [r.jobId, parseInt(r.cnt, 10) || 0]));
      for (const j of jobs) {
        (j as Job & { offerCount?: number }).offerCount = byId.get(j.id) ?? 0;
      }
    } catch (e) {
      this.logger.warn(`_attachOfferCounts failed: ${(e as Error).message}`);
    }
  }

  async setFeaturedOrder(
    id: string,
    featuredOrder: number | null,
  ): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    job.featuredOrder = featuredOrder;
    return this.jobsRepository.save(job);
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);

    const customer = await this.usersService.findById(job.customerId);
    if (customer) {
      const { passwordHash: _ph, ...safe } = customer as {
        passwordHash?: string;
      } & typeof customer;
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
        // Phase Two-Sided — offer kind ilanlarda poster usta olduğu için
        // worker tarafı stats ve workerCategories da görünür.
        asWorkerTotal: (safe as any).asWorkerTotal ?? 0,
        asWorkerSuccess: (safe as any).asWorkerSuccess ?? 0,
        workerCategories: (safe as any).workerCategories ?? [],
        workerBio: (safe as any).workerBio ?? null,
        hourlyRateMinMinor: (safe as any).hourlyRateMinMinor ?? null,
        hourlyRateMaxMinor: (safe as any).hourlyRateMaxMinor ?? null,
        isAvailable: (safe as any).isAvailable ?? false,
      } as unknown as typeof job.customer;
    }
    return job;
  }

  async create(createJobDto: CreateJobDto, customerId: string): Promise<Job> {
    // Phase Two-Sided: kind='offer' sadece worker profili olanlar yayınlayabilir
    const kind = createJobDto.kind ?? JobKind.REQUEST;
    if (kind === JobKind.OFFER) {
      const user = await this.usersService.findById(customerId);
      const cats = user?.workerCategories;
      const isWorker = Array.isArray(cats) && cats.length > 0;
      if (!isWorker) {
        throw new BadRequestException(
          'Hizmet ilanı yayınlamak için önce usta profili oluşturmalısınız.',
        );
      }
    }

    // Phase 265 — "Bu Ustaya Özel İlan": ekstra kredi düş + hedef usta var mı doğrula.
    const targetWorkerId = createJobDto.targetWorkerId?.trim() || null;
    if (targetWorkerId) {
      if (targetWorkerId === customerId) {
        throw new BadRequestException(
          'Kendinize özel ilan açamazsınız.',
        );
      }
      const target = await this.usersService.findById(targetWorkerId);
      if (!target) {
        throw new BadRequestException('Seçilen usta bulunamadı.');
      }
      // Admin panel SystemSettings.private_listing_cost'tan oku (default 10).
      const costStr = await this.systemSettings.get(
        'private_listing_cost',
        '10',
      );
      const cost = Math.max(0, parseInt(costStr, 10) || 0);
      if (cost > 0) {
        await this.tokensService.spend(
          customerId,
          cost,
          `Özel ilan: ${target.fullName ?? target.id.slice(0, 8)} için`,
        );
      }
    }

    const job = this.jobsRepository.create({
      ...createJobDto,
      kind,
      customerId,
      targetWorkerId,
      scheduleFlexibility: createJobDto.scheduleFlexibility ?? 'flexible',
      // Phase 266 — saat alanları. anyTime true ise dueTime null'a düşür.
      dueTime: createJobDto.dueAnyTime ? null : (createJobDto.dueTime ?? null),
      dueAnyTime: createJobDto.dueAnyTime ?? false,
      status: JobStatus.OPEN,
      // Phase 174b — minor sync: TL float → integer kuruş
      budgetMinMinor: tlToMinor(createJobDto.budgetMin),
      budgetMaxMinor: tlToMinor(createJobDto.budgetMax),
    });
    // Phase 177 — geohash auto-compute for proximity index
    if (job.latitude != null && job.longitude != null) {
      job.geohash = encodeGeohash(job.latitude, job.longitude, 6) || null;
    }
    const saved = await this.jobsRepository.save(job);
    // Phase 116 / 259: fire-and-forget fraud check.
    // SAFETY: not awaited → create() returns immediately; FraudDetectionService
    // swallows all AI errors internally (returns {score:0}), and the outer
    // .catch() swallows any DB-update failure. A fraud check can NEVER block or
    // fail job creation. `void` matches the no-floating-promises convention used
    // by the sibling _notifyCategorySubscribers call below.
    void this.fraudDetection
      .analyzeJobListing(saved.title, saved.description)
      .then(async (r) => {
        if (r.score >= 70) {
          await this.jobsRepository.update(saved.id, {
            flagged: true,
            flagReason: r.reasons.join('; '),
            fraudScore: r.score,
          });
          // Phase 259: surface high-risk listings for moderation.
          this.logger.warn(
            `Job ${saved.id} flagged as high fraud risk (score=${r.score}): ${r.reasons.join('; ')}`,
          );
          // Phase 259: alert admins. Best-effort & error-swallowed inside the
          // helper — already on a fire-and-forget chain, so it can never block
          // or fail job creation.
          await this._notifyAdminsOfFraudFlag(
            saved,
            r.score,
            r.reasons.join('; '),
          );
        } else {
          await this.jobsRepository.update(saved.id, { fraudScore: r.score });
        }
      })
      .catch((e) => {
        this.logger.warn(
          `Fraud post-processing failed for job ${saved.id}: ${(e as Error)?.message ?? String(e)}`,
        );
      });
    // Phase 143 — fire-and-forget category subscription notifications
    void this._notifyCategorySubscribers(saved);

    // Phase 265 — özel ilan ise hedef ustaya davet bildirimi.
    if (targetWorkerId) {
      void this.notificationsService
        .send({
          userId: targetWorkerId,
          type: NotificationType.PRIVATE_LISTING_INVITE,
          title: 'Sana özel bir ilan açıldı',
          body: `"${saved.title}" ilanını sadece sen görebilirsin. Teklifini ver.`,
          refId: saved.id,
          relatedType: 'job',
          relatedId: saved.id,
        })
        .catch((e) =>
          this.logger.warn(
            `Private listing invite notify failed for ${saved.id}: ${(e as Error).message}`,
          ),
        );
    }

    return saved;
  }

  async update(
    id: string,
    updateJobDto: UpdateJobDto,
    requesterId?: string,
  ): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    if (requesterId && job.customerId !== requesterId) {
      throw new ForbiddenException('Bu ilanı düzenleme yetkiniz yok.');
    }
    const prevStatus = job.status;

    // Lifecycle disiplin: durum değişiyorsa ALLOWED_TRANSITIONS denetle
    if (updateJobDto.status && updateJobDto.status !== prevStatus) {
      if (!isValidTransition(prevStatus, updateJobDto.status)) {
        throw new ForbiddenException(
          `Geçersiz durum geçişi: ${prevStatus} → ${updateJobDto.status}`,
        );
      }
    }

    Object.assign(job, updateJobDto);
    // Phase 174b — UpdateJobDto budget alanları içermiyor; create() pathinde sync yeterli
    // Phase 177 — geohash recompute when location changes
    if (job.latitude != null && job.longitude != null) {
      job.geohash = encodeGeohash(job.latitude, job.longitude, 6) || null;
    }
    const saved = await this.jobsRepository.save(job);

    if (updateJobDto.status && updateJobDto.status !== prevStatus) {
      await this._trackStatusChange(
        saved.id,
        saved.customerId,
        prevStatus,
        saved.status,
      );

      // Job cancelled — apply cancellation policy + notify the side that did NOT cancel
      if (
        prevStatus !== JobStatus.CANCELLED &&
        saved.status === JobStatus.CANCELLED
      ) {
        try {
          const acceptedOfferForPolicy = await this.offersRepository.findOne({
            where: { jobId: saved.id, status: OfferStatus.ACCEPTED },
          });

          let appliesTo: string;
          let appliesAtStage: string;

          if (!acceptedOfferForPolicy) {
            appliesTo = 'customer_cancel';
            appliesAtStage = 'before_assignment';
          } else {
            const isCustomerCancel = requesterId === saved.customerId;
            appliesTo = isCustomerCancel ? 'customer_cancel' : 'tasker_cancel';
            if (prevStatus === JobStatus.OPEN)
              appliesAtStage = 'before_assignment';
            else if (prevStatus === JobStatus.IN_PROGRESS)
              appliesAtStage = 'in_progress';
            else if (prevStatus === JobStatus.PENDING_COMPLETION)
              appliesAtStage = 'pending_completion';
            else appliesAtStage = 'any';
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

          if (policy && escrow && escrow.status === EscrowStatus.HELD) {
            const calc = this.cancellationService.calculateRefund(
              escrow.amount,
              policy,
            );
            // Policy-driven refunds always go through as 'system' so EscrowService's
            // admin/system gate doesn't reject the kullanıcı-initiated cancel call.
            const refundUserId = 'system';
            if (calc.refundAmount >= escrow.amount) {
              await this.escrowService.refund(
                escrow.id,
                refundUserId,
                calc.refundAmount,
                `İptal politikası: ${policy.name}`,
              );
            } else if (calc.refundAmount > 0) {
              await this.escrowService.refund(
                escrow.id,
                refundUserId,
                calc.refundAmount,
                `Kısmi iade — ${policy.name}`,
              );
            }
            // refundAmount = 0 → escrow held, admin resolves
          }
        } catch (err) {
          this.logger.warn(
            `Cancellation policy application failed for job ${saved.id}: ${(err as Error)?.message ?? err}`,
          );
        }
      }

      if (saved.status === JobStatus.CANCELLED) {
        const acceptedOffer = await this.offersRepository.findOne({
          where: { jobId: saved.id, status: OfferStatus.ACCEPTED },
        });
        // Only the customer can update via this method (ForbiddenException above),
        // so the "other side" is the assigned tasker if there is one.
        const otherUserId =
          requesterId === saved.customerId
            ? (acceptedOffer?.userId ?? null)
            : saved.customerId;
        if (otherUserId && otherUserId !== requesterId) {
          await this.notificationsService.send({
            userId: otherUserId,
            type: NotificationType.JOB_CANCELLED,
            title: 'İş iptal edildi',
            body: `"${saved.title}" ilanı iptal edildi.`,
            refId: saved.id,
          });
        }
      }
    }

    return saved;
  }

  /** Usta "iş bitti" der → pending_completion. Ancak teklif sahibi olabilir. */
  async submitCompletion(jobId: string, taskerId: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${jobId}`);

    // Sadece ilanın kabul edilmiş teklif sahibi (atanan usta) bunu yapabilir
    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId, status: OfferStatus.ACCEPTED },
    });
    if (!acceptedOffer || acceptedOffer.userId !== taskerId) {
      throw new ForbiddenException('Bu ilana atanan usta değilsiniz.');
    }
    if (!isValidTransition(job.status, JobStatus.PENDING_COMPLETION)) {
      throw new ForbiddenException(
        `Geçersiz geçiş: ${job.status} → pending_completion`,
      );
    }
    job.status = JobStatus.PENDING_COMPLETION;
    const saved = await this.jobsRepository.save(job);

    // Notify customer that tasker submitted completion
    await this.notificationsService.send({
      userId: saved.customerId,
      type: NotificationType.JOB_PENDING_COMPLETION,
      title: 'İş tamamlandı olarak işaretlendi',
      body: `"${saved.title}" ilanınız için usta işi bitirdiğini belirtti. Lütfen onaylayın.`,
      refId: saved.id,
    });
    return saved;
  }

  /** Müşteri "tamamlandı" onayı → completed (istatistik & itibar günceller). */
  async approveCompletion(jobId: string, customerId: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${jobId}`);
    if (job.customerId !== customerId) {
      throw new ForbiddenException('Bu ilanın sahibi değilsiniz.');
    }
    if (!isValidTransition(job.status, JobStatus.COMPLETED)) {
      throw new ForbiddenException(
        `Geçersiz geçiş: ${job.status} → completed (ilan ${job.status})`,
      );
    }
    const prev = job.status;
    job.status = JobStatus.COMPLETED;
    const saved = await this.jobsRepository.save(job);
    await this._trackStatusChange(
      saved.id,
      saved.customerId,
      prev,
      saved.status,
    );

    // Release escrow funds to tasker — bookkeeping only, don't break completion
    try {
      const escrow = await this.escrowService.getByJob(saved.id);
      if (
        escrow &&
        (escrow.status === EscrowStatus.HELD ||
          escrow.status === EscrowStatus.DISPUTED)
      ) {
        await this.escrowService.release(
          escrow.id,
          customerId,
          'Müşteri tamamlamayı onayladı',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Escrow release failed for job ${saved.id}: ${(err as Error)?.message ?? err}`,
      );
    }

    // Notify the assigned tasker that customer approved completion
    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId: saved.id, status: OfferStatus.ACCEPTED },
    });
    if (acceptedOffer) {
      await this.notificationsService.send({
        userId: acceptedOffer.userId,
        type: NotificationType.JOB_COMPLETED,
        title: 'İş tamamlandı',
        body: `"${saved.title}" ilanı müşteri tarafından onaylandı. Tebrikler!`,
        refId: saved.id,
      });
    }
    return saved;
  }

  /** Taraflardan biri ilanı uyuşmazlık olarak işaretler → disputed. */
  async raiseDispute(
    jobId: string,
    requesterId: string,
    payload: {
      disputeType: DisputeType;
      reason: string;
      evidenceUrls?: string[];
    },
  ): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${jobId}`);

    // Müşteri veya atanan usta olmalı
    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId, status: OfferStatus.ACCEPTED },
    });
    const isCustomer = job.customerId === requesterId;
    const isTasker = acceptedOffer?.userId === requesterId;
    if (!isCustomer && !isTasker) {
      throw new ForbiddenException('Sadece taraflar uyuşmazlık açabilir.');
    }
    if (!isValidTransition(job.status, JobStatus.DISPUTED)) {
      throw new ForbiddenException(
        `Bu durumdan uyuşmazlık açılamaz: ${job.status}`,
      );
    }
    job.status = JobStatus.DISPUTED;
    const saved = await this.jobsRepository.save(job);

    // Mark escrow as disputed if currently HELD — bookkeeping only
    let escrowId: string | null = null;
    try {
      const escrow = await this.escrowService.getByJob(saved.id);
      if (escrow) {
        escrowId = escrow.id;
        if (escrow.status === EscrowStatus.HELD) {
          await this.escrowService.dispute(
            escrow.id,
            requesterId,
            'İlan disputed durumuna geçti',
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Escrow dispute failed for job ${saved.id}: ${(err as Error)?.message ?? err}`,
      );
    }

    // Determine counterparty
    const counterPartyUserId = isCustomer
      ? (acceptedOffer?.userId ?? null)
      : job.customerId;

    // Create JobDispute row
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
      } catch (err) {
        this.logger.warn(
          `JobDispute create failed for job ${saved.id}: ${(err as Error)?.message ?? err}`,
        );
      }
    }

    // Notify the OTHER party
    if (counterPartyUserId) {
      await this.notificationsService.send({
        userId: counterPartyUserId,
        type: NotificationType.DISPUTE_OPENED,
        title: 'Uyuşmazlık açıldı',
        body: `"${saved.title}" ilanı için karşı taraf uyuşmazlık açtı.`,
        refId: saved.id,
      });
    }
    return saved;
  }

  private async _trackStatusChange(
    jobId: string,
    customerId: string,
    prev: JobStatus,
    next: JobStatus,
  ) {
    if (next === JobStatus.COMPLETED) {
      if (prev !== JobStatus.COMPLETED)
        await this.usersService.bumpStat(customerId, 'asCustomerTotal');
      await this.usersService.bumpStat(customerId, 'asCustomerSuccess');
      await this.usersService.recalcReputation(customerId);

      // Find accepted offer and bump worker stats
      const acceptedOffer = await this.offersRepository.findOne({
        where: { jobId, status: OfferStatus.ACCEPTED },
      });
      if (acceptedOffer) {
        await this.usersService.bumpStat(
          acceptedOffer.userId,
          'asWorkerSuccess',
        );
        await this.usersService.recalcReputation(acceptedOffer.userId);
      }
    } else if (next === JobStatus.CANCELLED) {
      if (prev !== JobStatus.CANCELLED)
        await this.usersService.bumpStat(customerId, 'asCustomerTotal');
      await this.usersService.bumpStat(customerId, 'asCustomerFail');
      await this.usersService.recalcReputation(customerId);

      // Find accepted offer and bump worker fail stats
      const acceptedOffer = await this.offersRepository.findOne({
        where: { jobId, status: OfferStatus.ACCEPTED },
      });
      if (acceptedOffer) {
        await this.usersService.bumpStat(acceptedOffer.userId, 'asWorkerFail');
        await this.usersService.recalcReputation(acceptedOffer.userId);
      }
    }
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number = 20,
    category?: string,
  ): Promise<(Job & { distanceKm: number })[]> {
    // Phase 243 — defensive guard: invalid coordinates or stale schema must
    // degrade to empty list rather than 500 on this public geo endpoint.
    if (
      lat == null ||
      lng == null ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng)
    ) {
      return [];
    }
    try {
      // SQLite positional params — dataSource.query() uses ? placeholders
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

      // lat, lng appear twice (distance calc + WHERE), radiusKm at end
      const params: unknown[] = [lat, lng, lat, lat, lng, lat, radiusKm];

      if (category) {
        sql += ` AND LOWER(j.category) = LOWER(?)`;
        params.push(category);
      }

      // "Öne Çıkan" ilanlar her zaman en üstte, sonra mesafeye göre.
      // featuredOrder camelCase → Postgres'te lowercasing'i önlemek için tırnaklı
      // (SQLite de çift-tırnaklı tanımlayıcıyı kabul eder).
      sql += ` ORDER BY (CASE WHEN j."featuredOrder" IS NOT NULL THEN 0 ELSE 1 END) ASC, j."featuredOrder" ASC, distanceKm ASC LIMIT 50`;

      const rows = await this.dataSource.query(sql, params);
      // Phase 272 — Harita pop-up poster mini-card için poster bilgisi ekle.
      // _attachPosters Job[] üzerinde mutate eder; raw row'lar da customerId
      // taşıdığı için aynı şekilde davranır.
      await this._attachPosters(rows as Job[]);
      return rows as (Job & { distanceKm: number })[];
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `findNearby(lat=${lat},lng=${lng},r=${radiusKm},cat=${category ?? ''}) failed: ${e?.message ?? String(err)}`,
        e?.stack,
      );
      return [];
    }
  }

  async remove(id: string, requesterId?: string): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`İlan bulunamadı: #${id}`);
    if (requesterId && job.customerId !== requesterId) {
      throw new ForbiddenException('Bu ilanı silme yetkiniz yok.');
    }
    await this.jobsRepository.remove(job);
  }

  // ─── İş Tamamlama ve QR Entegrasyonu ──────────────────────────────────────

  async generateQr(
    id: string,
    requesterId: string,
  ): Promise<{ qrCode: string }> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    // Yalnızca ilan sahibi QR oluşturabilir
    if (job.customerId !== requesterId) {
      throw new ForbiddenException('Yalnızca müşteri QR kod oluşturabilir.');
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'QR kod sadece devam eden işler için oluşturulabilir.',
      );
    }

    const qrCode = crypto.randomUUID();
    job.qrCode = qrCode;
    await this.jobsRepository.save(job);

    return { qrCode };
  }

  async verifyQr(
    id: string,
    qrCode: string,
    requesterId: string,
  ): Promise<{ success: boolean }> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    // Müşteri kendi QR'ını tarayamaz, usta taramalı.
    if (job.customerId === requesterId) {
      throw new ForbiddenException('QR kodu usta taramalıdır.');
    }

    if (!job.qrCode || job.qrCode !== qrCode) {
      throw new BadRequestException('Geçersiz QR kod.');
    }

    job.isQrVerified = true;
    await this.jobsRepository.save(job);
    return { success: true };
  }

  async completeJobWithPayment(id: string, requesterId: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    // Usta veya müşteri tamamlayabilir, genelde usta tetikler.
    if (!job.isQrVerified) {
      throw new BadRequestException(
        'İşi tamamlamadan önce müşterinin QR kodunu taramalısınız.',
      );
    }

    const hasPhotos = job.endJobPhotos && job.endJobPhotos.length > 0;
    const hasVideos = job.endJobVideos && job.endJobVideos.length > 0;

    if (!hasPhotos && !hasVideos) {
      throw new BadRequestException(
        'İşi tamamlamak için en az bir adet iş sonu görseli veya videosu eklemelisiniz.',
      );
    }

    // Kabul edilen teklifi bul (fiyat ve usta ID'si için)
    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId: id, status: OfferStatus.ACCEPTED },
    });

    if (!acceptedOffer) {
      throw new BadRequestException(
        'Bu işe ait kabul edilmiş bir teklif bulunamadı.',
      );
    }

    // -- Banka Aracılığıyla Komisyon Kesintisi Simülasyonu --
    const jobPrice = acceptedOffer.counterPrice || acceptedOffer.price;
    const platformCommissionRate = 0.1; // %10 Komisyon
    const commissionAmount = jobPrice * platformCommissionRate;
    const workerAmount = jobPrice - commissionAmount;

    this.logger.log(
      `[BANKA İŞLEMİ] İlan=${job.id} müşteri=${jobPrice}₺ komisyon=${commissionAmount.toFixed(2)}₺ usta=${workerAmount.toFixed(2)}₺`,
    );
    // -------------------------------------------------------

    const prevStatus = job.status;
    job.status = JobStatus.COMPLETED;
    const saved = await this.jobsRepository.save(job);

    await this._trackStatusChange(
      saved.id,
      saved.customerId,
      prevStatus,
      saved.status,
    );

    return saved;
  }

  // ─── Phase 203: Bulk photo upload ────────────────────────────────────────────

  /**
   * POST /jobs/:id/photos/bulk
   * İş sahibi veya kabul edilen usta max 5 fotoğraf yükler.
   * Sharp: 1200px max width, quality 80, JPEG output.
   */
  async uploadPhotosBulk(
    jobId: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<{ photos: string[] }> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('İlan bulunamadı');

    // Yetki: iş sahibi veya kabul edilen usta
    const isOwner = job.customerId === userId;
    if (!isOwner) {
      const accepted = await this.offersRepository.findOne({
        where: { jobId, status: OfferStatus.ACCEPTED },
      });
      if (!accepted || accepted.userId !== userId) {
        throw new ForbiddenException('Bu işlem için yetkiniz yok');
      }
    }

    const current = job.photos ?? [];
    if (current.length + files.length > 5) {
      throw new BadRequestException(
        `Toplam fotoğraf sayısı 5'i geçemez (mevcut: ${current.length})`,
      );
    }

    const dir = join(APP_ROOT, 'uploads', 'jobs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const newUrls: string[] = [];
    for (const file of files) {
      const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filename = `${baseName}.jpg`;
      const dest = join(dir, filename);
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
}
