import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Phase 438 — IP block list (manual + auto-detect).
 *
 * Used by BotProtectionMiddleware to reject requests before they reach
 * any route handler. Admin can manage via /admin/blocked-ips.
 */
@Entity('blocked_ips')
@Index(['ip'], { unique: true })
export class BlockedIp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 64 })
  ip!: string;

  @Column({ length: 255, default: '' })
  reason!: string;

  /** Soft expiry — null = permanent. Middleware checks against now(). */
  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  /** Admin user id (uuid string) or 'system' for auto-detect. */
  @Column({ length: 64, default: 'system' })
  blockedBy!: string;

  /** Last user-agent seen — diagnostic hint. */
  @Column({ length: 500, default: '' })
  lastUserAgent!: string;

  /** Hit count since block — incremented by middleware (best-effort). */
  @Column({ type: 'integer', default: 0 })
  hitCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
