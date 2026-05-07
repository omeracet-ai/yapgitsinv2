import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Job, JobStatus, isValidTransition } from './job.entity';
import { Offer, OfferStatus } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowStatus } from '../escrow/payment-escrow.entity';
import { CancellationService } from '../cancellation/cancellation.service';
import { DisputesService } from '../disputes/disputes.service';
import { DisputeType } from '../disputes/job-dispute.entity';

// Geçerli UUID — SQLite ve PostgreSQL uyumlu sabit seed kimliği
const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private jobsRepository: Repository<Job>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    private usersService: UsersService,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private escrowService: EscrowService,
    private cancellationService: CancellationService,
    private disputesService: DisputesService,
  ) {}

  async onModuleInit() {
    const seedUser = await this.usersService.findByEmail('seed@hizmet.app');
    if (!seedUser) {
      await this.usersService.create({
        id: SEED_USER_ID,
        fullName: 'Seed User',
        phoneNumber: '05555555555',
        email: 'seed@hizmet.app',
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
          status: JobStatus.OPEN,
          customerId: userId,
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
  }) {
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

    query
      .orderBy('CASE WHEN job.featuredOrder IS NOT NULL THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('job.featuredOrder', 'ASC')
      .addOrderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
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
      } as unknown as typeof job.customer;
    }
    return job;
  }

  async create(createJobDto: CreateJobDto, customerId: string): Promise<Job> {
    const job = this.jobsRepository.create({
      ...createJobDto,
      customerId,
      status: JobStatus.OPEN,
    });
    return this.jobsRepository.save(job);
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
            ? acceptedOffer?.userId ?? null
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
    await this._trackStatusChange(saved.id, saved.customerId, prev, saved.status);

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
      ? acceptedOffer?.userId ?? null
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

    sql += ` ORDER BY distanceKm ASC LIMIT 50`;

    const rows = await this.dataSource.query(sql, params);
    return rows as (Job & { distanceKm: number })[];
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

  async generateQr(id: string, requesterId: string): Promise<{ qrCode: string }> {
    const job = await this.jobsRepository.findOne({ where: { id } });
    if (!job) throw new NotFoundException('İlan bulunamadı');
    
    // Yalnızca ilan sahibi QR oluşturabilir
    if (job.customerId !== requesterId) {
      throw new ForbiddenException('Yalnızca müşteri QR kod oluşturabilir.');
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      throw new BadRequestException('QR kod sadece devam eden işler için oluşturulabilir.');
    }

    const qrCode = crypto.randomUUID();
    job.qrCode = qrCode;
    await this.jobsRepository.save(job);

    return { qrCode };
  }

  async verifyQr(id: string, qrCode: string, requesterId: string): Promise<{ success: boolean }> {
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
      throw new BadRequestException('İşi tamamlamadan önce müşterinin QR kodunu taramalısınız.');
    }

    const hasPhotos = job.endJobPhotos && job.endJobPhotos.length > 0;
    const hasVideos = job.endJobVideos && job.endJobVideos.length > 0;

    if (!hasPhotos && !hasVideos) {
      throw new BadRequestException('İşi tamamlamak için en az bir adet iş sonu görseli veya videosu eklemelisiniz.');
    }

    // Kabul edilen teklifi bul (fiyat ve usta ID'si için)
    const acceptedOffer = await this.offersRepository.findOne({
      where: { jobId: id, status: OfferStatus.ACCEPTED },
    });

    if (!acceptedOffer) {
      throw new BadRequestException('Bu işe ait kabul edilmiş bir teklif bulunamadı.');
    }

    // -- Banka Aracılığıyla Komisyon Kesintisi Simülasyonu --
    const jobPrice = acceptedOffer.counterPrice || acceptedOffer.price;
    const platformCommissionRate = 0.10; // %10 Komisyon
    const commissionAmount = jobPrice * platformCommissionRate;
    const workerAmount = jobPrice - commissionAmount;

    console.log(`[BANKA İŞLEMİ] İlan: ${job.id}`);
    console.log(`- Müşteriden Çekilen Tutar: ${jobPrice} ₺`);
    console.log(`- Platform Komisyonu (%10): ${commissionAmount.toFixed(2)} ₺`);
    console.log(`- Ustaya Aktarılacak Tutar: ${workerAmount.toFixed(2)} ₺`);
    // -------------------------------------------------------

    const prevStatus = job.status;
    job.status = JobStatus.COMPLETED;
    const saved = await this.jobsRepository.save(job);

    await this._trackStatusChange(saved.id, saved.customerId, prevStatus, saved.status);

    return saved;
  }
}
