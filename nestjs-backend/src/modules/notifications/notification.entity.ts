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
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
