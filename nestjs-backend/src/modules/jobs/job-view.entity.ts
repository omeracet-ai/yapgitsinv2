import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Phase 333 — İlan detay ekran ziyaret kaydı. IP başına günde 1 view
 * dedupe'lanır → `unique(jobId, ipHash, viewedDate)`. `Job.viewCount` yok;
 * sayım her zaman bu tablodan `COUNT(*)` ile hesaplanır → tutarsızlık olmaz.
 */
@Entity('job_views')
@Index('idx_jobviews_jobId', ['jobId'])
@Unique('uq_jobviews_dedupe', ['jobId', 'ipHash', 'viewedDate'])
export class JobView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  jobId: string;

  /** SHA-256(ip + salt). Düz IP saklama YOK (KVKK / privacy). */
  @Column({ type: 'varchar', length: 64 })
  ipHash: string;

  /** YYYY-MM-DD (UTC) — aynı IP günde 1 kez sayılır. */
  @Column({ type: 'varchar', length: 10 })
  viewedDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
