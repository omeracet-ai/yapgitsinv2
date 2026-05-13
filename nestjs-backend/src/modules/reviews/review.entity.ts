import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

@Entity('reviews')
@Index('idx_reviews_revieweeId_createdAt', ['revieweeId', 'createdAt'])
@Index('idx_reviews_reviewerId', ['reviewerId'])
@Index('idx_reviews_jobId', ['jobId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  /** FK → jobs.id (opsiyonel: provider profili yorumlarında null olabilir) */
  @Column({ type: 'varchar', length: 36, nullable: true })
  jobId: string | null;

  @ManyToOne(() => Job, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'jobId' })
  job: Job | null;

  /** Değerlendirmeyi yazan kullanıcı FK → users.id */
  @Column({ type: 'varchar', length: 36 })
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  /** Değerlendirilen kullanıcı FK → users.id */
  @Column({ type: 'varchar', length: 36 })
  revieweeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'revieweeId' })
  reviewee: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  /** Değerlendirilen kişinin yoruma cevabı (Phase 42) */
  @Column({ type: 'text', nullable: true })
  replyText: string | null;

  @Column({ type: 'datetime', nullable: true })
  repliedAt: Date | null;

  /** Phase 116: AI fraud-flag */
  @Column({ type: 'boolean', default: false })
  flagged: boolean;

  @Column({ type: 'text', nullable: true })
  flagReason: string | null;

  @Column({ type: 'integer', nullable: true })
  fraudScore: number | null;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
