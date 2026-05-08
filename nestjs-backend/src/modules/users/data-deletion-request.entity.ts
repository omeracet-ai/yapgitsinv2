import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum DataDeletionRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

@Entity('data_deletion_requests')
export class DataDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: DataDeletionRequestStatus,
    default: DataDeletionRequestStatus.PENDING,
  })
  status: DataDeletionRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime' })
  scheduledDeletionAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  processedBy: string | null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;
}
