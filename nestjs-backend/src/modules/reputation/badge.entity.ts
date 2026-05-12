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

export type BadgeType =
  | 'verified'
  | 'top_rated'
  | 'fast_responder'
  | 'reliable'
  | 'expert'
  | 'newcomer'
  | 'power_tasker';

/**
 * Phase 165 — Achievement badges.
 * Auto-awarded based on reputation milestones and work quality metrics.
 * Examples: verified, top_rated, fast_responder, reliable, expert.
 */
@Entity('badges')
@Index(['userId', 'badgeType'])
@Index(['userId', 'awardedAt'])
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  /** User who received the badge */
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Badge type identifier */
  @Column({ type: 'varchar', length: 50 })
  badgeType: BadgeType;

  /** Human-readable badge name (TR & EN) */
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  /** Description of the badge */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** URL to badge icon */
  @Column({ type: 'varchar', nullable: true })
  iconUrl: string | null;

  /** Badge color/theme (hex or named color) */
  @Column({ type: 'varchar', length: 50, default: 'blue' })
  color: string;

  /** Rarity level: common, rare, epic, legendary */
  @Column({ type: 'varchar', length: 50, default: 'common' })
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  /** Criteria used to award this badge (JSON) */
  @Column({ type: 'simple-json', nullable: true })
  criteria: Record<string, unknown> | null;

  /** If false, badge was removed/revoked */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** Reason for revocation */
  @Column({ type: 'text', nullable: true })
  revokedReason: string | null;

  @CreateDateColumn()
  awardedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;
}
