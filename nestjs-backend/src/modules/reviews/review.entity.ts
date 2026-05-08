import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn()
  createdAt: Date;
}
