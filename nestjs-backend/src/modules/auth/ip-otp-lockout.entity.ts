import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Phase 231 (Voldi-sec) — DB-level per-IP OTP attempt counter.
 *
 * Defence-in-depth III on top of:
 *   - Katman 1: per-OTP DB counter (`sms_otps.attempts` cap 5)
 *   - Katman 2: per-IP HTTP throttle (5/15dk, in-memory — resets on restart)
 *
 * This row persists across restarts and aggregates failures across **all**
 * phone numbers tried from a single IP. Threshold: 15 failures / 15dk → lock
 * for 30dk. Successful verify resets the counter.
 *
 * PK = `ip` (one row per IP, atomic UPSERT pattern).
 */
@Entity('ip_otp_lockouts')
@Index(['lockedUntil'])
export class IpOtpLockout {
  /** IPv6 max length is 45 chars (e.g. mapped IPv4: ::ffff:192.168.0.1). */
  @PrimaryColumn({ type: 'varchar', length: 45 })
  ip!: string;

  /** Failed verify attempts within the current rolling window. */
  @Column({ type: 'int', default: 0 })
  attempts!: number;

  /** When the current window started — used to roll attempts back to 0. */
  @Column({ type: 'datetime' })
  windowStartedAt!: Date;

  /** If set + in the future, all verify attempts from this IP are blocked. */
  @Column({ type: 'datetime', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
