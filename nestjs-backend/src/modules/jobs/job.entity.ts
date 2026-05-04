import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

export enum JobStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** Kategori adı (denormalize — hızlı okuma için) */
  @Column({ type: 'varchar', length: 100 })
  category: string;

  /** FK → categories.id (opsiyonel) */
  @Column({ type: 'varchar', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, {
    eager: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  categoryRef: Category;

  @Column({ type: 'varchar', length: 200 })
  location: string;

  /** float kullanıyoruz — SQLite'da decimal string döner, float sayı döner */
  @Column({ type: 'float', nullable: true })
  budgetMin: number;

  @Column({ type: 'float', nullable: true })
  budgetMax: number;

  @Column({ type: 'simple-enum', enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;

  /** FK → users.id  (müşteri) */
  @Column({ type: 'varchar' })
  customerId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  /** İlan fotoğrafları (URL dizisi) */
  @Column({ type: 'simple-json', nullable: true, default: null })
  photos: string[] | null;

  /** 1-3 → öne çıkan ilan sırası, null = normal */
  @Column({ type: 'integer', nullable: true, default: null })
  featuredOrder: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
