import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * M2 — 404 Monitor. Aggregates 404 hits by URL.
 */
@Entity('notfound_log')
@Index('uq_notfound_url', ['url'], { unique: true })
export class NotFoundLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ type: 'integer', default: 1 })
  hitCount!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referrer!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipHash!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  lastSeenAt!: Date;
}
