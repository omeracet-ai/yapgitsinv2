import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M10 — Loyalty tier transactions.
 * Type: earn|redeem|bonus. Separate from token economy.
 */
@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_loyalty_user')
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: 'earn' | 'redeem' | 'bonus' | 'tier_up';

  @Column({ type: 'integer', default: 0 })
  points!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
