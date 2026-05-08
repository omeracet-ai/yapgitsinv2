import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Phase 143 — Category+City job alert subscription.
 * Yeni iş ilanı geldiğinde subscriber'a Notification + FCM gönderilir.
 */
@Entity('category_subscriptions')
@Unique(['userId', 'category', 'city'])
export class CategorySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'boolean', default: true })
  alertEnabled: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastNotifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
