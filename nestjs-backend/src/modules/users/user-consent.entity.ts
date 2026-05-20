import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Phase 256 (Voldi-db) — KVKK Compliance.
 *
 * Records each user's acceptance (and optional later revocation) of a specific
 * consent type + version. One row per acceptance event so we keep an immutable
 * audit trail (a re-accept after a version bump creates a new row).
 *
 * `consentType` is a plain varchar (not simple-enum) for SQLite compat and to
 * avoid migration churn when new consent kinds are added. The TS string-union
 * keeps callers type-safe.
 */
export type ConsentType = 'kvkk' | 'terms' | 'marketing';

@Entity('user_consents')
@Index('idx_user_consents_user_type_revoked', [
  'userId',
  'consentType',
  'revokedAt',
])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  consentType: ConsentType;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @CreateDateColumn()
  acceptedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;
}
