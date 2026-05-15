import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum TxType {
  PURCHASE = 'purchase',
  SPEND = 'spend',
  REFUND = 'refund',
}
export enum PaymentMethod {
  BANK = 'bank',
  CRYPTO = 'crypto',
  SYSTEM = 'system',
  IYZIPAY = 'iyzipay',
}
export enum TxStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('token_transactions')
@Index('idx_token_tx_userId_createdAt', ['userId', 'createdAt'])
@Index('idx_token_tx_type_status', ['type', 'status'])
export class TokenTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'simple-enum', enum: TxType })
  type: TxType;

  /** @deprecated Phase 174 — use amountMinor (kuruş). */
  @Column({ type: 'float' })
  amount: number;

  // Phase 174c — Integer minor units (kuruş)
  @Column({ type: 'integer', default: 0 })
  amountMinor!: number;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'simple-enum', enum: TxStatus, default: TxStatus.COMPLETED })
  status: TxStatus;

  @Column({ type: 'simple-enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod | null;

  /** Banka/kripto ödeme referans no */
  @Column({ type: 'varchar', nullable: true })
  paymentRef: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
