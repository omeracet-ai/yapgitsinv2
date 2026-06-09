import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M8 — Message log: outgoing email / FCM / SMS / WA.
 */
@Entity('message_log')
export class MessageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_msglog_channel')
  @Column({ type: 'varchar', length: 16 })
  channel!: 'email' | 'fcm' | 'sms' | 'wa';

  @Index('idx_msglog_status')
  @Column({ type: 'varchar', length: 16, default: 'sent' })
  status!: 'pending' | 'sent' | 'failed';

  @Column({ type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  meta!: Record<string, unknown> | null;

  @Index('idx_msglog_created')
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
