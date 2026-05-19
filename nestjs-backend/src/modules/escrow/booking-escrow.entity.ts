import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import {
  ConfirmationStatus,
  ConfirmationTier,
} from './payment-escrow.entity';

export enum BookingEscrowStatus {
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * Phase 136 — Token-based booking escrow.
 * Customer onayında token escrow'a hold'lanır. Job completed → worker release.
 * Cancel → customer refund (Phase 128 cancel flow ile entegre).
 */
@Entity('booking_escrows')
@Index('idx_booking_escrows_workerId_status', ['workerId', 'status'])
@Index('idx_booking_escrows_status', ['status'])
export class BookingEscrow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  customerId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  workerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({
    type: 'simple-enum',
    enum: BookingEscrowStatus,
    default: BookingEscrowStatus.HELD,
  })
  status: BookingEscrowStatus;

  @CreateDateColumn()
  heldAt: Date;

  @Column({ type: 'datetime', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  refundedAmount: number | null;

  // Phase 174c — Integer minor units (kuruş). Added by Voldi-db backfill.
  @Column({ type: 'integer', default: 0 })
  amountMinor!: number;

  // Phase 257 — Mutual confirmation flow bridged from PaymentEscrow.
  // These columns mirror the payment_escrows confirmation contract so that
  // /escrow/:id/confirmation/* can operate on booking_escrows rows too.
  @Column({
    type: 'simple-enum',
    enum: ConfirmationStatus,
    default: ConfirmationStatus.NONE,
  })
  confirmationStatus: ConfirmationStatus;

  @Column({
    type: 'simple-enum',
    enum: ConfirmationTier,
    nullable: true,
  })
  confirmationTier: ConfirmationTier | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  qrToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  qrIssuedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  qrScannedAt: Date | null;

  @Column({ type: 'float', nullable: true })
  workerLat: number | null;

  @Column({ type: 'float', nullable: true })
  workerLng: number | null;

  @Column({ type: 'float', nullable: true })
  customerLat: number | null;

  @Column({ type: 'float', nullable: true })
  customerLng: number | null;

  @Column({ type: 'datetime', nullable: true })
  workerConfirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  customerConfirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  confirmationDeadline: Date | null;

  // Phase 254a — Platform commission split on release.
  @Column({ type: 'integer', nullable: true })
  platformFeeMinor: number | null;

  @Column({ type: 'real', nullable: true })
  platformFeePct: number | null;

  @Column({ type: 'integer', nullable: true })
  workerPayoutMinor: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
