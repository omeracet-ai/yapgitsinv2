import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('service_requests')
@Index('idx_service_requests_status_createdAt', ['status', 'createdAt'])
@Index('idx_service_requests_userId_status', ['userId', 'status'])
@Index('idx_service_requests_categoryId_status', ['categoryId', 'status'])
@Index('idx_service_requests_geohash', ['geohash'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  categoryId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 200 })
  location: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  /** Phase 177 — geohash prefix (precision 6) for fast proximity queries */
  @Column({ type: 'varchar', length: 12, nullable: true })
  geohash: string | null;

  // Fiyat DB'de tutulur, UI'da gösterilmez
  /** @deprecated Phase 174 — use priceMinor (kuruş). */
  @Column({ type: 'float', nullable: true })
  price: number;

  // Phase 174 — Integer minor units (kuruş)
  @Column({ type: 'integer', nullable: true })
  priceMinor: number | null;

  @Column({ type: 'simple-enum', enum: ['open', 'closed'], default: 'open' })
  status: string;

  // Öne Çıkanlar altyapısı
  @Column({ type: 'integer', nullable: true })
  featuredOrder: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
