import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DisputeType {
  QUALITY = 'quality',
  PAYMENT = 'payment',
  NON_DELIVERY = 'non_delivery',
  INCOMPLETE = 'incomplete',
  OTHER = 'other',
}

export enum DisputeResolutionStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED_CUSTOMER = 'resolved_customer',
  RESOLVED_TASKER = 'resolved_tasker',
  RESOLVED_SPLIT = 'resolved_split',
  DISMISSED = 'dismissed',
}

@Entity('job_disputes')
export class JobDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  jobId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  raisedByUserId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  counterPartyUserId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  escrowId: string | null;

  @Column({
    type: 'simple-enum',
    enum: DisputeType,
  })
  disputeType: DisputeType;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceUrls: string[] | null;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: DisputeResolutionStatus,
    default: DisputeResolutionStatus.OPEN,
  })
  resolutionStatus: DisputeResolutionStatus;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  resolvedByAdminId: string | null;

  @Column({ type: 'float', nullable: true })
  refundAmount: number | null;

  @Column({ type: 'float', nullable: true })
  taskerCompensationAmount: number | null;

  @CreateDateColumn()
  raisedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
