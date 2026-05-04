import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum TxType { PURCHASE = 'purchase', SPEND = 'spend', REFUND = 'refund' }
export enum PaymentMethod { BANK = 'bank', CRYPTO = 'crypto', SYSTEM = 'system' }
export enum TxStatus { PENDING = 'pending', COMPLETED = 'completed', FAILED = 'failed' }

@Entity('token_transactions')
export class TokenTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'simple-enum', enum: TxType })
  type: TxType;

  @Column({ type: 'float' })
  amount: number;

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
