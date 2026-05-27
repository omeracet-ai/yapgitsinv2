import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PaymentEscrow, ConfirmationStatus } from './payment-escrow.entity';
import { EscrowService } from './escrow.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

/**
 * Phase 253 — Auto-dispute timer.
 * Every 15 minutes, finds escrows whose mutual confirmation deadline (72h post-start)
 * has expired without both sides signing off, and pushes them into DISPUTED so an
 * admin can resolve manually. Both parties get notified.
 */
@Injectable()
export class EscrowConfirmationTimeoutService {
  private readonly logger = new Logger(EscrowConfirmationTimeoutService.name);

  constructor(
    @InjectRepository(PaymentEscrow)
    private readonly escrowRepo: Repository<PaymentEscrow>,
    private readonly escrowService: EscrowService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 */15 * * * *')
  async sweep(): Promise<void> {
    const now = new Date();
    // Phase 267 — first finalize PENDING_GRACE escrows whose grace window
    // has elapsed; THEN process stale awaits as dispute.
    await this.finalizeGrace(now);

    const stale = await this.escrowRepo.find({
      where: {
        paymentStatus: 'paid',
        confirmationStatus: ConfirmationStatus.AWAITING_CONFIRMATION,
        confirmationDeadline: LessThan(now),
      },
    });
    if (stale.length === 0) return;
    this.logger.log(`auto-disputing ${stale.length} stale confirmations`);

    for (const e of stale) {
      try {
        await this.escrowService.dispute(
          e.id,
          e.customerId, // system actor; dispute() requires party — pick customer side
          'confirmation timeout (72h)',
        );
        for (const uid of [e.customerId, e.taskerId]) {
          try {
            await this.notifications.send({
              userId: uid,
              type: NotificationType.DISPUTE_OPENED,
              title: 'Onay süresi doldu',
              body: 'Karşılıklı onay 72 saat içinde tamamlanmadı. İş uyuşmazlık olarak işaretlendi; ekibimiz inceleyecek.',
              refId: e.id,
            });
          } catch (err) {
            this.logger.warn(
              `notify ${uid} for escrow ${e.id} failed: ${(err as Error).message}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `auto-dispute escrow ${e.id} failed: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Phase 267 — flip PENDING_GRACE escrows whose graceEndsAt elapsed into
   * COMPLETED and trigger the actual money release.
   */
  private async finalizeGrace(now: Date): Promise<void> {
    const grace = await this.escrowRepo.find({
      where: {
        confirmationStatus: ConfirmationStatus.PENDING_GRACE,
        graceEndsAt: LessThan(now),
      },
    });
    if (grace.length === 0) return;
    this.logger.log(`finalizing ${grace.length} grace-elapsed escrows`);

    for (const e of grace) {
      try {
        e.confirmationStatus = ConfirmationStatus.COMPLETED;
        await this.escrowRepo.save(e);
        // Release payment (admin role bypasses customer-only guard).
        await this.escrowService.release(
          e.id,
          'system',
          'plain confirm grace elapsed',
          'admin',
        );
        for (const uid of [e.customerId, e.taskerId]) {
          try {
            await this.notifications.send({
              userId: uid,
              type: NotificationType.SYSTEM,
              title: 'Hizmet Tamamlandı',
              body: 'Onay süreci tamamlandı; ödeme serbest bırakıldı.',
              refId: e.id,
            });
          } catch (err) {
            this.logger.warn(
              `notify ${uid} for finalize ${e.id} failed: ${(err as Error).message}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(
          `finalize grace ${e.id} failed: ${(err as Error).message}`,
        );
      }
    }
  }
}
