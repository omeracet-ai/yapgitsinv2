import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  IYZIPAY = 'iyzipay',
  MOCK = 'mock',
  BANK_TRANSFER = 'bank_transfer',
}

@Entity('payments')
@Index(['customerId', 'createdAt'])
@Index(['workerId', 'createdAt'])
@Index(['status'])
@Index(['externalTransactionId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  // Customer (payer)
  @Column({ type: 'varchar', length: 36 })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  // Worker (receiver)
  @Column({ type: 'varchar', length: 36 })
  workerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'workerId' })
  worker: User;

  // Booking reference
  @Column({ type: 'varchar', length: 36, nullable: true })
  bookingId: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking | null;

  // Amount in minor units (cents/kuruş for TRY)
  @Column({ type: 'integer' })
  amountMinor: number; // e.g., 50000 = 500.00 TRY

  // Currency code (e.g., 'TRY', 'USD')
  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  // Payment status
  @Column({
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // Payment method used
  @Column({
    type: 'simple-enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  method: PaymentMethod;

  // External transaction ID from payment provider
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalTransactionId: string | null;

  // Provider-specific request ID (for idempotency)
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerRequestId: string | null;

  // Payment intent ID (Stripe-compatible)
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentIntentId: string | null;

  // Refund ID if refunded
  @Column({ type: 'varchar', length: 255, nullable: true })
  refundId: string | null;

  // Refunded amount in minor units
  @Column({ type: 'integer', nullable: true })
  refundedAmountMinor: number | null;

  // Fee charged by payment provider in minor units
  @Column({ type: 'integer', nullable: true })
  feeMinor: number | null;

  // Net amount received in minor units
  @Column({ type: 'integer', nullable: true })
  netAmountMinor: number | null;

  // Error message if payment failed
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // Payment description
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Idempotency key to prevent duplicate charges
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  idempotencyKey: string | null;

  // Customer receipt email
  @Column({ type: 'varchar', length: 255, nullable: true })
  receiptEmail: string | null;

  // Metadata (JSON) for additional data
  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Completion timestamp — no explicit DB type so TypeORM picks the driver default
  // (timestamp on postgres, datetime on sqlite/mysql). Keeps sqlite e2e tests working.
  @Column({ type: Date, nullable: true })
  completedAt: Date | null;
}
