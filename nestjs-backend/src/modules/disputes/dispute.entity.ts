import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum GeneralDisputeType {
  QUALITY = 'quality',
  PAYMENT = 'payment',
  NO_SHOW = 'no_show',
  FRAUD = 'fraud',
  OTHER = 'other',
}

export enum GeneralDisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

/**
 * Phase 117 — General-purpose dispute (independent of escrow flow).
 * For escrow-tied disputes use JobDispute.
 */
@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  jobId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  bookingId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  raisedBy: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  againstUserId: string;

  @Column({ type: 'simple-enum', enum: GeneralDisputeType })
  type: GeneralDisputeType;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: GeneralDisputeStatus,
    default: GeneralDisputeStatus.OPEN,
  })
  status: GeneralDisputeStatus;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  resolvedBy: string | null;

  /**
   * Phase 144 — AI ön-analiz: fairness skoru, fraud risk, çözüm önerisi.
   * Schema: { fairnessScore: 0-100, fraudRisk: 'low'|'medium'|'high',
   *          suggestedAction: 'refund'|'partial_refund'|'cancel'|'dismiss'|'escalate',
   *          reasoning: string, analyzedAt: string }
   */
  @Column({ type: 'simple-json', nullable: true })
  aiAnalysis: {
    fairnessScore: number;
    fraudRisk: 'low' | 'medium' | 'high';
    suggestedAction: 'refund' | 'partial_refund' | 'cancel' | 'dismiss' | 'escalate';
    reasoning: string;
    analyzedAt: string;
  } | null;

  @CreateDateColumn()
  createdAt: Date;
}
