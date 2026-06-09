import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M3 — Google Search Console fetch cache. 1h TTL.
 */
@Entity('gsc_cache')
export class GscCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_gsc_key', { unique: true })
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'simple-json' })
  payload!: unknown;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
