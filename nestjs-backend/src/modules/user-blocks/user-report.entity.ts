import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type UserReportReason =
  | 'spam'
  | 'harassment'
  | 'fraud'
  | 'inappropriate'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'other';

export type UserReportStatus = 'pending' | 'reviewed' | 'dismissed';

@Entity('user_reports')
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  reporterUserId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  reportedUserId: string;

  @Column({
    type: 'simple-enum',
    enum: [
      'spam',
      'harassment',
      'fraud',
      'inappropriate',
      'fake_profile',
      'inappropriate_content',
      'other',
    ],
  })
  reason: UserReportReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'simple-enum',
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending',
  })
  status: UserReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
