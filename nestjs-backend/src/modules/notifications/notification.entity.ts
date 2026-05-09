import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  BOOKING_REQUEST = 'booking_request', // Yeni randevu isteği
  BOOKING_CONFIRMED = 'booking_confirmed', // Randevu onaylandı
  BOOKING_CANCELLED = 'booking_cancelled', // Randevu iptal
  BOOKING_COMPLETED = 'booking_completed', // İş tamamlandı
  NEW_OFFER = 'new_offer', // Yeni teklif geldi
  OFFER_ACCEPTED = 'offer_accepted', // Teklifin kabul edildi
  OFFER_REJECTED = 'offer_rejected', // Teklifin reddedildi
  NEW_REVIEW = 'new_review', // Yeni değerlendirme
  SYSTEM = 'system', // Sistem mesajı
  COUNTER_OFFER = 'counter_offer', // Pazarlık fiyatı önerildi
  OFFER_EXPIRED = 'offer_expired', // Teklif süresi doldu
  DISPUTE_OPENED = 'dispute_opened', // Uyuşmazlık açıldı
  DISPUTE_RESOLVED = 'dispute_resolved', // Uyuşmazlık çözüldü
  JOB_PENDING_COMPLETION = 'job_pending_completion', // Usta bittim dedi, müşteri onayı bekliyor
  JOB_COMPLETED = 'job_completed', // İş tamamlandı (job lifecycle)
  JOB_CANCELLED = 'job_cancelled', // İş iptal edildi (job lifecycle)
  REVIEW_REMINDER = 'review_reminder', // 7 gün geçti, değerlendirme hatırlatması
  SAVED_SEARCH_MATCH = 'saved_search_match', // Kayıtlı aramaya uyan yeni ilan
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'simple-enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  // İlgili kayıt ID'si (bookingId, offerId, reviewId vb.)
  @Column({ type: 'varchar', length: 36, nullable: true })
  refId: string | null;

  // Phase 71 — deep link target type for client-side routing
  @Column({ type: 'varchar', length: 20, nullable: true })
  relatedType: string | null;

  // Phase 71 — deep link target id (often equal to refId, but can override —
  // e.g. COUNTER_OFFER refId is offerId, relatedId is jobId for navigation)
  @Column({ type: 'varchar', length: 36, nullable: true })
  relatedId: string | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
