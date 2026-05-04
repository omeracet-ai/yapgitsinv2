import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum BookingStatus {
  PENDING    = 'pending',    // Müşteri oluşturdu, usta onaylamadı
  CONFIRMED  = 'confirmed',  // Usta kabul etti
  IN_PROGRESS= 'in_progress',// İş başladı
  COMPLETED  = 'completed',  // İş tamamlandı
  CANCELLED  = 'cancelled',  // İptal
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Müşteri
  @Column({ type: 'varchar' })
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  // Usta
  @Column({ type: 'varchar' })
  workerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'workerId' })
  worker: User;

  // Hizmet detayı
  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subCategory: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  // Randevu zamanı
  @Column({ type: 'varchar', length: 20 })
  scheduledDate: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 10, nullable: true })
  scheduledTime: string | null; // HH:MM

  // Durum
  @Column({ type: 'simple-enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  // Fiyat (usta tarafından veya anlaşma ile belirlenir)
  @Column({ type: 'float', nullable: true })
  agreedPrice: number | null;

  @Column({ type: 'text', nullable: true })
  workerNote: string | null;  // Ustanın notu

  @Column({ type: 'text', nullable: true })
  customerNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
