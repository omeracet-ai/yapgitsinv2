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
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { isPlatformCommissionEnabled } from './fee.service';

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
    private readonly platformSettings: PlatformSettingsService,
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

      // Audit log is best-effort — escrow operations must succeed even if the
      // log row write fails (e.g., schema drift between deployments).
      try {
        await em.save(
          em.create(AdminAuditLog, {
            adminUserId: customerId,
            action: 'escrow.hold',
            targetType: 'booking_escrow',
            targetId: saved.id,
            payload: { bookingId, customerId, workerId, amount },
          }),
        );
      } catch (e) {
        // swallow — schema drift on audit table mustn't block escrow hold
        console.warn(
          '[booking-escrow] audit log skipped:',
          e instanceof Error ? e.message : String(e),
        );
      }

      return saved;
    });
  }

  /** Customer onayı: held → released. Worker'a token gider. Atomic + idempotent.
   *  Phase 278d: 'system'/'admin' actor bypass (grace finalize'in cascade
   *  release tetiklemesi için). */
  async release(
    bookingId: string,
    actorId: string,
    opts?: { actorRole?: string },
  ): Promise<BookingEscrow> {
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
      const isAdmin = opts?.actorRole === 'admin' || actorId === 'system';
      if (escrow.customerId !== actorId && !isAdmin) {
        throw new ForbiddenException('Sadece müşteri release edebilir');
      }
      if (escrow.status !== BookingEscrowStatus.HELD) {
        throw new BadRequestException(
          `Escrow ${escrow.status} durumunda, release edilemez`,
        );
      }

      // Phase 254a — Commission split. commission_pct_qr (default 1%) of the
      // escrow amount goes to the platform admin account; remainder to worker.
      // Commission master switch (default OFF): when disabled the platform takes
      // 0% and the worker receives 100%. Dormant code kept; re-enable via env
      // PLATFORM_COMMISSION_ENABLED=true (shared with FeeService).
      const pctRaw = isPlatformCommissionEnabled()
        ? await this.platformSettings.getNumber('commission_pct_qr', 1)
        : 0;
      // Clamp 0..100 — defensive against bad admin input.
      const pct = Math.max(0, Math.min(100, pctRaw));
      const totalAmount = Number(escrow.amount) || 0;
      const commissionAmount =
        Math.round(((totalAmount * pct) / 100) * 100) / 100;
      const workerPayout =
        Math.round((totalAmount - commissionAmount) * 100) / 100;

      escrow.status = BookingEscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.platformFeePct = pct;
      escrow.platformFeeMinor = Math.round(commissionAmount * 100);
      escrow.workerPayoutMinor = Math.round(workerPayout * 100);
      const saved = await em.save(escrow);

      // Worker payout (net of commission)
      if (workerPayout > 0) {
        await em.increment(
          User,
          { id: escrow.workerId },
          'tokenBalance',
          workerPayout,
        );
        await em.save(
          em.create(TokenTransaction, {
            userId: escrow.workerId,
            type: TxType.PURCHASE,
            amount: workerPayout,
            description: `Escrow release — booking ${bookingId} (net of ${pct}% platform fee)`,
            status: TxStatus.COMPLETED,
            paymentMethod: PaymentMethod.SYSTEM,
            paymentRef: `ESCROW-RELEASE-${bookingId}`,
          }),
        );
      }

      // Platform fee — credit admin user if exists, else virtual (tx-only).
      if (commissionAmount > 0) {
        const adminUser = await em.findOne(User, {
          where: { email: 'admin@yapgitsin.tr' },
        });
        if (adminUser) {
          await em.increment(
            User,
            { id: adminUser.id },
            'tokenBalance',
            commissionAmount,
          );
          await em.save(
            em.create(TokenTransaction, {
              userId: adminUser.id,
              type: TxType.PURCHASE,
              amount: commissionAmount,
              description: `Platform fee (${pct}%) — booking ${bookingId}`,
              status: TxStatus.COMPLETED,
              paymentMethod: PaymentMethod.SYSTEM,
              paymentRef: `ESCROW-FEE-${bookingId}`,
            }),
          );
        } else {
          // Phase 257 — no platform admin user exists. token_transactions.userId
          // is now nullable, so persist the platform fee as a virtual (userId:null)
          // tx row instead of dropping it, keeping the commission ledger complete.
          await em.save(
            em.create(TokenTransaction, {
              userId: null,
              type: TxType.PURCHASE,
              amount: commissionAmount,
              description: `Platform fee (${pct}%) — booking ${bookingId} (virtual, no admin account)`,
              status: TxStatus.COMPLETED,
              paymentMethod: PaymentMethod.SYSTEM,
              paymentRef: `ESCROW-FEE-${bookingId}`,
            }),
          );
        }
      }

      try {
        await em.save(
          em.create(AdminAuditLog, {
            adminUserId: actorId,
            action: 'escrow.release',
            targetType: 'booking_escrow',
            targetId: saved.id,
            payload: {
              bookingId,
              workerId: escrow.workerId,
              amount: totalAmount,
              platformFeePct: pct,
              platformFee: commissionAmount,
              workerPayout,
            },
          }),
        );
      } catch (e) {
        console.warn(
          '[booking-escrow] audit log skipped:',
          e instanceof Error ? e.message : String(e),
        );
      }

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
    if (escrow.customerId !== requesterId && escrow.workerId !== requesterId) {
      throw new ForbiddenException('Bu escrow size ait değil');
    }
    return escrow;
  }
}
