import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  from: string;

  @Column({ type: 'varchar' })
  to: string;

  @Column({ type: 'text' })
  message: string;

  // Optional context: which Job this message belongs to (Airtasker-style task chat).
  // No FK relation on purpose — keeps migration cascade simple. Nullable for back-compat.
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  jobId: string | null;

  // Optional context: which Booking this message belongs to.
  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  bookingId: string | null;

  @Column({ type: 'boolean', default: false })
  flagged: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  flagReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Phase 68: read-receipt timestamp. NULL = unread (single tick),
  // non-null = read (double tick).
  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  // Phase 139: optional file attachment (image or document).
  @Column({ type: 'varchar', nullable: true })
  attachmentUrl: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  attachmentType: 'image' | 'document' | 'audio' | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  attachmentName: string | null;

  @Column({ type: 'int', nullable: true })
  attachmentSize: number | null;

  // Phase 151: audio attachment duration in seconds (voice notes).
  @Column({ type: 'int', nullable: true })
  attachmentDuration: number | null;
}
