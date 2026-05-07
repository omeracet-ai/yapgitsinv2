import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CancellationAppliesTo {
  CUSTOMER_CANCEL = 'customer_cancel',
  TASKER_CANCEL = 'tasker_cancel',
  MUTUAL_CANCEL = 'mutual_cancel',
  DISPUTE_RESOLVED_CUSTOMER = 'dispute_resolved_customer',
  DISPUTE_RESOLVED_TASKER = 'dispute_resolved_tasker',
}

export enum CancellationAppliesAtStage {
  BEFORE_ASSIGNMENT = 'before_assignment',
  AFTER_ASSIGNMENT = 'after_assignment',
  IN_PROGRESS = 'in_progress',
  PENDING_COMPLETION = 'pending_completion',
  ANY = 'any',
}

@Entity('cancellation_policies')
export class CancellationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: CancellationAppliesTo,
  })
  appliesTo: CancellationAppliesTo;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: CancellationAppliesAtStage,
    default: CancellationAppliesAtStage.ANY,
  })
  appliesAtStage: CancellationAppliesAtStage;

  @Column({ type: 'integer', default: 0 })
  minHoursElapsed: number;

  @Column({ type: 'integer', nullable: true })
  maxHoursElapsed: number | null;

  @Column({ type: 'float', default: 0 })
  refundPercentage: number;

  @Column({ type: 'float', default: 0 })
  taskerCompensationPercentage: number;

  @Column({ type: 'float', default: 0 })
  platformFeePercentage: number;

  @Index()
  @Column({ type: 'integer', default: 100 })
  priority: number;

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
