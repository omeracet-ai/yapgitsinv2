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

/**
 * Airtasker-style ilan yaşam döngüsü.
 * Akış:
 *   open → in_progress → pending_completion → completed
 *                     ↘ disputed (her iki taraf yükseltebilir)
 *                     ↘ cancelled (open/in_progress'tan iptal)
 *
 * `open` semantik olarak Airtasker'ın "posted", `in_progress` "assigned"
 * karşılığı — DB değerleri geriye dönük uyumluluk için aynı kalıyor.
 */
export enum JobStatus {
  OPEN = 'open',                              // ilan yayında, teklif kabul ediyor (Airtasker: posted)
  IN_PROGRESS = 'in_progress',                // teklif kabul edildi, iş başladı (Airtasker: assigned)
  PENDING_COMPLETION = 'pending_completion',  // usta "bitirdim" dedi, müşteri onayı bekliyor
  COMPLETED = 'completed',                    // müşteri onayladı
  CANCELLED = 'cancelled',                    // iptal
  DISPUTED = 'disputed',                      // çatışma — admin müdahalesi
}

/** Bir durumdan diğerine geçişlere izin var mı? */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.OPEN]:               [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
  [JobStatus.IN_PROGRESS]:        [JobStatus.PENDING_COMPLETION, JobStatus.CANCELLED, JobStatus.DISPUTED],
  [JobStatus.PENDING_COMPLETION]: [JobStatus.COMPLETED, JobStatus.IN_PROGRESS, JobStatus.DISPUTED],
  [JobStatus.COMPLETED]:          [JobStatus.DISPUTED], // post-completion uyuşmazlık
  [JobStatus.CANCELLED]:          [],
  [JobStatus.DISPUTED]:           [JobStatus.COMPLETED, JobStatus.CANCELLED], // admin çözüm
};

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) return true; // no-op izin
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
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
  @Column({ type: 'varchar', length: 36, nullable: true })
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
  @Column({ type: 'varchar', length: 36 })
  customerId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  /** İlan fotoğrafları (URL dizisi) */
  @Column({ type: 'simple-json', nullable: true, default: null })
  photos: string[] | null;

  /** İlan videoları (URL dizisi) */
  @Column({ type: 'simple-json', nullable: true, default: null })
  videos: string[] | null;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  /** Teslim/bitiş tarihi — YYYY-MM-DD formatında */
  @Column({ type: 'varchar', length: 10, nullable: true, default: null })
  dueDate: string | null;

  /** İşi tamamlamak için QR kod */
  @Column({ type: 'varchar', nullable: true, default: null })
  qrCode: string | null;

  /** QR kod tarandı mı? */
  @Column({ type: 'boolean', default: false })
  isQrVerified: boolean;

  /** İş bitimi kanıt fotoğrafları */
  @Column({ type: 'simple-json', nullable: true, default: null })
  endJobPhotos: string[] | null;

  /** İş bitimi kanıt videoları */
  @Column({ type: 'simple-json', nullable: true, default: null })
  endJobVideos: string[] | null;

  /** Phase 19: Tamamlanma fotoğrafları (usta yükler) */
  @Column({ type: 'simple-json', nullable: true, default: null })
  completionPhotos: string[] | null;

  /** 1-3 → öne çıkan ilan sırası, null = normal */
  @Column({ type: 'integer', nullable: true, default: null })
  featuredOrder: number | null;

  /** Boost bitiş zamanı — null ise boost yok */
  @Column({ type: 'datetime', nullable: true })
  featuredUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
