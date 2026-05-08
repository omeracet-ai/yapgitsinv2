import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  CancellationReason,
  RefundStatus,
} from './booking.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Notification,
  NotificationType,
} from '../notifications/notification.entity';
import { AvailabilityService } from '../availability/availability.service';
import {
  TokenTransaction,
  TxType,
  TxStatus,
  PaymentMethod,
} from '../tokens/token-transaction.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private repo: Repository<Booking>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
    private dataSource: DataSource,
    private auditService: AdminAuditService,
  ) {}

  /**
   * Phase 128 — Refund policy:
   *   24h+ before scheduled → 100%
   *   <24h before scheduled → 50%
   *   Past scheduled time   → 0%
   */
  private _computeRefund(
    scheduledAt: Date | null,
    agreedPrice: number | null,
  ): { percent: number; amount: number } {
    if (!agreedPrice || agreedPrice <= 0) return { percent: 0, amount: 0 };
    if (!scheduledAt) return { percent: 100, amount: agreedPrice };
    const now = Date.now();
    const diffMs = scheduledAt.getTime() - now;
    const oneDay = 24 * 60 * 60 * 1000;
    let percent: number;
    if (diffMs >= oneDay) percent = 100;
    else if (diffMs >= 0) percent = 50;
    else percent = 0;
    const amount = Math.round(agreedPrice * percent) / 100;
    return { percent, amount };
  }

  /** Phase 128 — Cancel a booking with refund policy + audit + atomic tx */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason: CancellationReason,
  ): Promise<{
    status: BookingStatus;
    refundAmount: number;
    refundStatus: RefundStatus;
    refundPercent: number;
    booking: Booking;
  }> {
    if (!Object.values(CancellationReason).includes(reason)) {
      throw new BadRequestException('Geçersiz iptal sebebi');
    }

    // Phase 128 sec-fix: full transaction with pessimistic lock on booking row,
    // ledger sync (tokenBalance += refund), audit + notifications inside TX so
    // any failure rolls back atomically.
    const result = await this.dataSource.transaction(async (em) => {
      // H2: pessimistic_write lock — guards against parallel double-cancel.
      // SQLite ignores most lock modes but TypeORM falls back gracefully;
      // we still re-validate state below for idempotency.
      let booking: Booking | null;
      try {
        booking = await em.findOne(Booking, {
          where: { id: bookingId },
          relations: ['customer', 'worker'],
          lock: { mode: 'pessimistic_write' },
        });
      } catch {
        // SQLite or driver without lock support — fallback to plain read
        booking = await em.findOne(Booking, {
          where: { id: bookingId },
          relations: ['customer', 'worker'],
        });
      }
      if (!booking) throw new NotFoundException('Randevu bulunamadı');
      if (booking.customerId !== userId && booking.workerId !== userId) {
        throw new ForbiddenException('Yetkisiz işlem');
      }
      // H2: idempotency — already-cancelled or completed → 400 (re-checked under lock)
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.COMPLETED
      ) {
        throw new BadRequestException(
          'Tamamlanmış veya iptal edilmiş randevular iptal edilemez',
        );
      }

      const scheduledAt = this._parseScheduled(
        booking.scheduledDate,
        booking.scheduledTime,
      );
      const { percent, amount } = this._computeRefund(
        scheduledAt,
        booking.agreedPrice,
      );
      const refundStatus: RefundStatus =
        amount > 0 ? RefundStatus.PENDING : RefundStatus.NONE;

      const old = booking.status;

      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelledBy = userId;
      booking.cancellationReason = reason;
      booking.refundAmount = amount;
      booking.refundStatus = refundStatus;
      const saved = await em.save(booking);

      // H1: Ledger ↔ balance sync. Insert REFUND tx AND increment user balance.
      if (amount > 0) {
        const tx = em.create(TokenTransaction, {
          userId: booking.customerId,
          type: TxType.REFUND,
          amount,
          description: `Booking ${booking.id} iptal — ${percent}% iade`,
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
        });
        await em.save(tx);
        // Atomic balance bump within TX
        await em.increment(User, { id: booking.customerId }, 'tokenBalance', amount);
      }

      // H3: notifications inside TX so they roll back on failure
      const cancelledByCustomer = userId === booking.customerId;
      const actor = cancelledByCustomer
        ? booking.customer?.fullName
        : booking.worker?.fullName;
      const counterPartyId = cancelledByCustomer
        ? booking.workerId
        : booking.customerId;
      await em.save(
        em.create(Notification, {
          userId: counterPartyId,
          type: NotificationType.BOOKING_CANCELLED,
          title: '❌ Randevu İptal Edildi',
          body: `${actor ?? 'Taraf'} randevuyu iptal etti. İade: ${amount}₺ (%${percent})`,
          refId: booking.id,
        }),
      );
      await em.save(
        em.create(Notification, {
          userId,
          type: NotificationType.BOOKING_CANCELLED,
          title: '❌ Randevu İptal Edildi',
          body: `İptal işlendi. İade tutarı: ${amount}₺ (%${percent})`,
          refId: booking.id,
        }),
      );

      // H3: audit log inside TX
      await em.save(
        em.create(AdminAuditLog, {
          adminUserId: userId,
          action: 'booking.cancel',
          targetType: 'booking',
          targetId: booking.id,
          payload: {
            reason,
            refundAmount: amount,
            refundPercent: percent,
            refundStatus,
            previousStatus: old,
            agreedPrice: booking.agreedPrice,
          },
        }),
      );

      return { saved, percent, amount, refundStatus, old };
    });

    // Stats outside TX (non-critical, idempotent recalcs)
    if (result.old !== BookingStatus.PENDING) {
      await this.usersService.bumpStat(result.saved.customerId, 'asCustomerFail');
      await this.usersService.bumpStat(result.saved.workerId, 'asWorkerFail');
      await this.usersService.recalcReputation(result.saved.customerId);
      await this.usersService.recalcReputation(result.saved.workerId);
    }

    return {
      status: result.saved.status,
      refundAmount: result.amount,
      refundStatus: result.refundStatus,
      refundPercent: result.percent,
      booking: result.saved,
    };
  }

  private _parseScheduled(
    dateStr: string | null | undefined,
    timeStr: string | null | undefined,
  ): Date | null {
    if (!dateStr) return null;
    const time = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '12:00';
    const iso = `${dateStr}T${time}:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Randevu oluştur (müşteri → ustaya istek gönderir) */
  async create(
    customerId: string,
    data: {
      workerId: string;
      category: string;
      subCategory?: string;
      description: string;
      address: string;
      scheduledDate: string;
      scheduledTime?: string;
      customerNote?: string;
    },
  ): Promise<Booking> {
    const worker = await this.usersService.findById(data.workerId);
    if (!worker) throw new NotFoundException('Usta bulunamadı');

    const scheduledAt = this._parseScheduled(
      data.scheduledDate,
      data.scheduledTime,
    );
    if (scheduledAt) {
      let ok = true;
      try {
        ok = await this.availabilityService.isAvailable(
          data.workerId,
          scheduledAt,
        );
      } catch (err) {
        this.logger.warn(
          `Availability check failed for worker ${data.workerId}: ${(err as Error).message}. Proceeding without block.`,
        );
        ok = true;
      }
      if (!ok) {
        throw new BadRequestException(
          'Seçtiğin tarih/saat için usta müsait değil. Müsait saatleri profilinden kontrol et.',
        );
      }
    }

    const booking = this.repo.create({
      customerId,
      workerId: data.workerId,
      category: data.category,
      subCategory: data.subCategory ?? null,
      description: data.description,
      address: data.address,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime ?? null,
      customerNote: data.customerNote ?? null,
      status: BookingStatus.PENDING,
    });
    const saved = await this.repo.save(booking);

    // Ustaya bildirim
    const customer = await this.usersService.findById(customerId);
    await this.notificationsService.send({
      userId: data.workerId,
      type: NotificationType.BOOKING_REQUEST,
      title: '📅 Yeni Randevu İsteği',
      body: `${customer?.fullName ?? 'Bir müşteri'} sizi ${data.category} için ${data.scheduledDate} tarihine randevu istedi.`,
      refId: saved.id,
    });

    return saved;
  }

  /** Randevu durumunu güncelle */
  async updateStatus(
    id: string,
    actorId: string,
    status: BookingStatus,
    note?: string,
  ): Promise<Booking> {
    const booking = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'worker'],
    });
    if (!booking) throw new NotFoundException('Randevu bulunamadı');

    // Yetki: usta onaylayabilir/reddedebilir; müşteri iptal edebilir
    const isWorker = booking.workerId === actorId;
    const isCustomer = booking.customerId === actorId;
    if (!isWorker && !isCustomer)
      throw new ForbiddenException('Yetkisiz işlem');

    const old = booking.status;
    booking.status = status;
    if (note) {
      if (isWorker) booking.workerNote = note;
      if (isCustomer) booking.customerNote = note;
    }
    const saved = await this.repo.save(booking);

    // Bildirimler
    await this._notifyStatusChange(saved, old, isWorker);

    // İstatistik güncelleme
    if (status === BookingStatus.COMPLETED) {
      await this.usersService.bumpStat(booking.customerId, 'asCustomerSuccess');
      await this.usersService.bumpStat(booking.workerId, 'asWorkerSuccess');
      await this.usersService.recalcReputation(booking.customerId);
      await this.usersService.recalcReputation(booking.workerId);
    }
    if (status === BookingStatus.CANCELLED) {
      if (old !== BookingStatus.PENDING) {
        // Onaylanmış randevu iptal → başarısız say
        await this.usersService.bumpStat(booking.customerId, 'asCustomerFail');
        await this.usersService.bumpStat(booking.workerId, 'asWorkerFail');
        await this.usersService.recalcReputation(booking.customerId);
        await this.usersService.recalcReputation(booking.workerId);
      }
    }

    return saved;
  }

  /** Müşterinin randevuları */
  async findByCustomer(customerId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { customerId },
      relations: ['worker'],
      order: { scheduledDate: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Ustanın randevuları */
  async findByWorker(workerId: string, page = 1, limit = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { workerId },
      relations: ['customer'],
      order: { scheduledDate: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Tek randevu detayı */
  async findOne(id: string, actorId: string): Promise<Booking> {
    const b = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'worker'],
    });
    if (!b) throw new NotFoundException('Randevu bulunamadı');
    if (b.customerId !== actorId && b.workerId !== actorId)
      throw new ForbiddenException('Yetkisiz işlem');
    return b;
  }

  private async _notifyStatusChange(
    b: Booking,
    _old: BookingStatus,
    isWorker: boolean,
  ) {
    if (b.status === BookingStatus.CONFIRMED) {
      await this.notificationsService.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: '✅ Randevunuz Onaylandı',
        body: `${b.worker?.fullName ?? 'Usta'} randevunuzu onayladı. Tarih: ${b.scheduledDate}`,
        refId: b.id,
      });
    }
    if (b.status === BookingStatus.CANCELLED) {
      const notifyId = isWorker ? b.customerId : b.workerId;
      const actor = isWorker ? b.worker?.fullName : b.customer?.fullName;
      await this.notificationsService.send({
        userId: notifyId,
        type: NotificationType.BOOKING_CANCELLED,
        title: '❌ Randevu İptal Edildi',
        body: `${actor ?? 'Taraf'} randevuyu iptal etti.`,
        refId: b.id,
      });
    }
    if (b.status === BookingStatus.COMPLETED) {
      await this.notificationsService.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_COMPLETED,
        title: '🎉 İş Tamamlandı',
        body: `${b.worker?.fullName ?? 'Usta'} işi tamamlandı olarak işaretledi. Değerlendirme yapmayı unutmayın!`,
        refId: b.id,
      });
    }
  }
}
