import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

@Entity('withdrawal_requests')
@Index(['workerId', 'status'])
@Index(['status', 'requestedAt'])
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  workerId: string;

  // Minor units (TRY kuruş). e.g. 50 TL = 5000.
  @Column({ type: 'integer' })
  amountMinor: number;

  @Column({ type: 'varchar', length: 34 })
  iban: string;

  @Column({ type: 'varchar', length: 100 })
  accountHolderName: string;

  @Column({
    type: 'simple-enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ type: Date, nullable: true })
  processedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  processedBy: string | null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ type: 'text', nullable: true })
  workerNote: string | null;
}
