import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

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

  @CreateDateColumn()
  createdAt: Date;
}
