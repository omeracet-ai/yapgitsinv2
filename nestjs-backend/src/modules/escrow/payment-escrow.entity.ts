import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EscrowId, JobId, OfferId, UserId } from '../../common/branded.types';

export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

@Entity('payment_escrows')
export class PaymentEscrow {
  @PrimaryGeneratedColumn('uuid')
  id: EscrowId;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  jobId: JobId;

  @Column({ type: 'varchar', length: 36 })
  offerId: OfferId;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  customerId: UserId;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  taskerId: UserId;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'float', default: 10 })
  platformFeePct: number;

  @Column({ type: 'float', nullable: true })
  platformFeeAmount: number | null;

  @Column({ type: 'float', nullable: true })
  taskerNetAmount: number | null;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({
    type: 'simple-enum',
    enum: EscrowStatus,
    default: EscrowStatus.HELD,
  })
  status: EscrowStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentRef: string | null;

  @Column({ type: 'varchar', length: 32, default: 'iyzipay' })
  paymentProvider: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentToken: string | null;

  @Column({ type: 'float', nullable: true })
  refundAmount: number | null;

  @Column({ type: 'text', nullable: true })
  releaseReason: string | null;

  @Column({ type: 'text', nullable: true })
  refundReason: string | null;

  @Column({ type: 'text', nullable: true })
  disputeReason: string | null;

  @CreateDateColumn()
  heldAt: Date;

  @Column({ type: 'datetime', nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  disputedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
