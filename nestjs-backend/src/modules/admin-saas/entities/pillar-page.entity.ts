import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * M5 — SEO pillar page (topic hub).
 */
@Entity('pillar_pages')
export class PillarPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_pillar_slug', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 120 })
  topic!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  clusterPostIds!: string[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  seoMetaTitle!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  seoMetaDesc!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'idle' })
  generationStatus!: 'idle' | 'running' | 'done' | 'failed';

  @Column({ type: 'text', nullable: true })
  generationError!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
