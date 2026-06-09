import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * M1 — AI Operations Assistant (admin chat).
 * Mode-based admin AI chat history. Each "session" groups a conversation.
 */
@Entity('admin_chat_messages')
export class AdminChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_admin_chat_session')
  @Column({ type: 'varchar', length: 64 })
  sessionId!: string;

  /** 'user' | 'assistant' */
  @Column({ type: 'varchar', length: 16 })
  role!: 'user' | 'assistant';

  @Column({ type: 'text' })
  content!: string;

  /** Conversation mode: seo|blog|content|analytics|support|ops|general */
  @Column({ type: 'varchar', length: 32, default: 'general' })
  mode!: string;

  /** Admin user id (FK to users.id, soft ref) */
  @Index('idx_admin_chat_admin')
  @Column({ type: 'varchar', length: 64, nullable: true })
  adminId!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
