import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M2 — Redirect rules. Source → destination + status.
 */
@Entity('redirects')
export class Redirect {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_redirect_src', { unique: true })
  @Column({ type: 'varchar', length: 512 })
  src!: string;

  @Column({ type: 'varchar', length: 512 })
  dst!: string;

  @Column({ type: 'integer', default: 301 })
  status!: 301 | 302;

  @Column({ type: 'integer', default: 0 })
  hits!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
