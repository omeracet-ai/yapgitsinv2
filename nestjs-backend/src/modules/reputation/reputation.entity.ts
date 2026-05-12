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

/**
 * Phase 165 — Reputation audit log.
 * Tracks all reputation score changes with time-decay calculation.
 * Enables transparency and historical analysis.
 */
@Entity('reputations')
@Index(['userId', 'createdAt'])
@Index(['userId', 'type'])
export class Reputation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  /** User whose reputation changed */
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Type of event: 'review', 'job_completion', 'job_cancellation', 'badge_awarded' */
  @Column({ type: 'varchar', length: 50 })
  type: 'review' | 'job_completion' | 'job_cancellation' | 'badge_awarded' | 'manual_adjustment';

  /** Reference ID (reviewId, jobId, badgeId, etc.) */
  @Column({ type: 'varchar', length: 36, nullable: true })
  referenceId: string | null;

  /** Points earned/lost in this event (can be negative) */
  @Column({ type: 'integer' })
  pointsChange: number;

  /** Previous reputation score (before this change) */
  @Column({ type: 'integer', nullable: true })
  previousScore: number | null;

  /** New reputation score (after this change) */
  @Column({ type: 'integer' })
  newScore: number;

  /** Raw data for this event (JSON) */
  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Visibility: true = public, false = internal only */
  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
