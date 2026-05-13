import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

@Entity('payment_escrows')
@Index('idx_payment_escrows_status', ['status'])
@Index('idx_payment_escrows_taskerId_status', ['taskerId', 'status'])
@Index('idx_payment_escrows_paymentStatus', ['paymentStatus'])
export class PaymentEscrow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  jobId: string;

  @Column({ type: 'varchar', length: 36 })
  offerId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  customerId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  taskerId: string;

  /** @deprecated Phase 174 — use amountMinor (kuruş). */
  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'float', default: 10 })
  platformFeePct: number;

  /** @deprecated Phase 174 — use platformFeeMinor (kuruş). */
  @Column({ type: 'float', nullable: true })
  platformFeeAmount: number | null;

  /** @deprecated Phase 174 — use workerPayoutMinor (kuruş). */
  @Column({ type: 'float', nullable: true })
  taskerNetAmount: number | null;

  // Phase 174c — Integer minor units (kuruş)
  @Column({ type: 'integer', default: 0 })
  amountMinor!: number;

  @Column({ type: 'integer', default: 0 })
  platformFeeMinor!: number;

  @Column({ type: 'integer', default: 0 })
  workerPayoutMinor!: number;

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

  // Phase 175 — iyzipay paymentTransactionId (needed for refunds) + capture state
  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentTxnId: string | null;

  /** 'pending' until iyzipay callback confirms, then 'paid' | 'failed' | 'refunded'. */
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  paymentStatus: string;

  /** True if a refund was attempted at iyzipay but failed (needs admin attention). */
  @Column({ type: 'boolean', default: false })
  refundNeedsAttention: boolean;

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
