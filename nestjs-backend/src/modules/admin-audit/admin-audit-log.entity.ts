import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Admin audit log — every sensitive admin action recorded for accountability
 * and GDPR/KVKK compliance. Denormalized actor email survives user deletion
 * (FK ON DELETE SET NULL).
 */
@Entity('admin_audit_logs')
@Index('idx_audit_actor_created', ['adminUserId', 'createdAt'])
@Index('idx_audit_action_created', ['action', 'createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  /**
   * Admin user id. Nullable so the row survives user deletion via FK SET NULL.
   * Historical rows (pre Phase 182) are still NOT NULL — only new rows benefit.
   */
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  adminUserId: string | null;

  /**
   * Denormalized actor email — preserved even after the user row is deleted,
   * so audit history remains attributable to a human identifier.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'adminUserId' })
  actor?: User | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetType: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  targetId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
