import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingEscrow, BookingEscrowStatus } from './booking-escrow.entity';
import { User } from '../users/user.entity';
import {
  TokenTransaction,
  TxType,
  TxStatus,
  PaymentMethod,
} from '../tokens/token-transaction.entity';
import { AdminAuditLog } from '../admin-audit/admin-audit-log.entity';

/**
 * Phase 136 — Token-based booking escrow service.
 * Atomic transitions; idempotent guards.
 */
@Injectable()
export class BookingEscrowService {
  constructor(
    @InjectRepository(BookingEscrow)
    private readonly repo: Repository<BookingEscrow>,
    private readonly dataSource: DataSource,
  ) {}

  /** Customer holds tokens for booking. Atomic: balance--, escrow create, tx log, audit. */
  async hold(
    bookingId: string,
    customerId: string,
    workerId: string,
    amount: number,
  ): Promise<BookingEscrow> {
    if (!bookingId || !customerId || !workerId) {
      throw new BadRequestException('Eksik parametre');
    }
    if (!(amount > 0)) {
      throw new BadRequestException('Miktar pozitif olmalı');
    }

    return this.dataSource.transaction(async (em) => {
      // Idempotent: aynı booking için aktif (held) escrow varsa hata
      const existing = await em.findOne(BookingEscrow, {
        where: { bookingId, status: BookingEscrowStatus.HELD },
      });
      if (existing) {
        throw new BadRequestException('Bu booking için aktif escrow var');
      }

      // Balance check + decrement (lock)
      let customer: User | null;
      try {
        customer = await em.findOne(User, {
          where: { id: customerId },
          lock: { mode: 'pessimistic_write' },
        });
      } catch {
        customer = await em.findOne(User, { where: { id: customerId } });
      }
      if (!customer) throw new NotFoundException('Müşteri bulunamadı');
      if ((customer.tokenBalance ?? 0) < amount) {
        throw new BadRequestException('Yetersiz bakiye');
      }

      await em.decrement(User, { id: customerId }, 'tokenBalance', amount);

      const escrow = em.create(BookingEscrow, {
        bookingId,
        customerId,
        workerId,
        amount,
        status: BookingEscrowStatus.HELD,
      });
      const saved = await em.save(escrow);

      await em.save(
        em.create(TokenTransaction, {
          userId: customerId,
          type: TxType.SPEND,
          amount,
          description: `Escrow hold — booking ${bookingId}`,
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
          paymentRef: `ESCROW-HOLD-${bookingId}`,
        }),
      );

      await em.save(
        em.create(AdminAuditLog, {
          adminUserId: customerId,
          action: 'escrow.hold',
          targetType: 'booking_escrow',
          targetId: saved.id,
          payload: { bookingId, customerId, workerId, amount },
        }),
      );

      return saved;
    });
  }

  /** Customer onayı: held → released. Worker'a token gider. Atomic + idempotent. */
  async release(bookingId: string, actorId: string): Promise<BookingEscrow> {
    return this.dataSource.transaction(async (em) => {
      let escrow: BookingEscrow | null;
      try {
        escrow = await em.findOne(BookingEscrow, {
          where: { bookingId },
          lock: { mode: 'pessimistic_write' },
        });
      } catch {
        escrow = await em.findOne(BookingEscrow, { where: { bookingId } });
      }
      if (!escrow) throw new NotFoundException('Escrow bulunamadı');
      if (escrow.customerId !== actorId) {
        throw new ForbiddenException('Sadece müşteri release edebilir');
      }
      if (escrow.status !== BookingEscrowStatus.HELD) {
        throw new BadRequestException(
          `Escrow ${escrow.status} durumunda, release edilemez`,
        );
      }

      escrow.status = BookingEscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      const saved = await em.save(escrow);

      await em.increment(
        User,
        { id: escrow.workerId },
        'tokenBalance',
        escrow.amount,
      );

      await em.save(
        em.create(TokenTransaction, {
          userId: escrow.workerId,
          type: TxType.PURCHASE,
          amount: escrow.amount,
          description: `Escrow release — booking ${bookingId}`,
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
          paymentRef: `ESCROW-RELEASE-${bookingId}`,
        }),
      );

      await em.save(
        em.create(AdminAuditLog, {
          adminUserId: actorId,
          action: 'escrow.release',
          targetType: 'booking_escrow',
          targetId: saved.id,
          payload: {
            bookingId,
            workerId: escrow.workerId,
            amount: escrow.amount,
          },
        }),
      );

      return saved;
    });
  }

  /**
   * Cancel/refund: held → refunded. Customer'a amount*percent geri.
   * Phase 128 cancelBooking() entegrasyonu.
   * percent: 0..100
   */
  async refund(
    bookingId: string,
    percent: number,
    actorId?: string,
  ): Promise<BookingEscrow | null> {
    if (percent < 0 || percent > 100) {
      throw new BadRequestException('Geçersiz yüzde');
    }
    return this.dataSource.transaction(async (em) => {
      let escrow: BookingEscrow | null;
      try {
        escrow = await em.findOne(BookingEscrow, {
          where: { bookingId },
          lock: { mode: 'pessimistic_write' },
        });
      } catch {
        escrow = await em.findOne(BookingEscrow, { where: { bookingId } });
      }
      if (!escrow) return null; // booking'de escrow olmayabilir (pre-Phase-136)
      if (escrow.status !== BookingEscrowStatus.HELD) {
        // Idempotent: zaten kapanmış
        return escrow;
      }

      const refundAmount =
        Math.round(((escrow.amount * percent) / 100) * 100) / 100;

      escrow.status =
        percent > 0
          ? BookingEscrowStatus.REFUNDED
          : BookingEscrowStatus.CANCELLED;
      escrow.refundedAt = new Date();
      escrow.refundedAmount = refundAmount;
      const saved = await em.save(escrow);

      if (refundAmount > 0) {
        await em.increment(
          User,
          { id: escrow.customerId },
          'tokenBalance',
          refundAmount,
        );

        await em.save(
          em.create(TokenTransaction, {
            userId: escrow.customerId,
            type: TxType.REFUND,
            amount: refundAmount,
            description: `Escrow refund (${percent}%) — booking ${bookingId}`,
            status: TxStatus.COMPLETED,
            paymentMethod: PaymentMethod.SYSTEM,
            paymentRef: `ESCROW-REFUND-${bookingId}`,
          }),
        );
      }

      await em.save(
        em.create(AdminAuditLog, {
          adminUserId: actorId ?? escrow.customerId,
          action: 'escrow.refund',
          targetType: 'booking_escrow',
          targetId: saved.id,
          payload: {
            bookingId,
            customerId: escrow.customerId,
            amount: escrow.amount,
            refundAmount,
            percent,
          },
        }),
      );

      return saved;
    });
  }

  async getByBooking(
    bookingId: string,
    requesterId: string,
  ): Promise<BookingEscrow | null> {
    const escrow = await this.repo.findOne({ where: { bookingId } });
    if (!escrow) return null;
    if (
      escrow.customerId !== requesterId &&
      escrow.workerId !== requesterId
    ) {
      throw new ForbiddenException('Bu escrow size ait değil');
    }
    return escrow;
  }
}
