import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  COUNTERED = 'countered',
}

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 36 })
  jobId: string;

  @ManyToOne(() => Job, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  // Provider kaldırıldı — artık userId kullanılır
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({
    type: 'simple-enum',
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  status: OfferStatus;

  @Column({ type: 'float', nullable: true, default: null })
  counterPrice: number | null;

  @Column({ type: 'text', nullable: true, default: null })
  counterMessage: string | null;

  // ── Counter-offer zinciri (Airtasker-style negotiation history) ────────
  // Bir karşı-teklif yapıldığında orijinal teklifin status'ı COUNTERED olur ve
  // YENİ bir Offer satırı oluşturulur, parentOfferId orijinali işaret eder.
  // Frontend `parentOfferId`'i zincirleyerek pazarlık geçmişini gösterir.
  @Column({ type: 'varchar', length: 36, nullable: true, default: null })
  parentOfferId: string | null;

  @Column({ type: 'integer', default: 0 })
  negotiationRound: number;

  // ── Airtasker-style ek dosyalar (foto, belge URL'leri) ─────────────────
  // Usta teklifine portföy/iş kanıtı/numune eklemek için. JSON dizisi olarak
  // saklanır — uploads endpoint'i (uploads/job-photos) URL döndürür, frontend
  // o URL listesini buraya yollar. En fazla 5 dosya, herhangi bir image/pdf URL.
  @Column({ type: 'simple-json', nullable: true, default: null })
  attachmentUrls: string[] | null;

  // ── Quote line items (Phase 13) ──────────────────────────────────────
  // Usta teklifini iş kalemlerine dökebilir. Her satır: label/qty/unitPrice/total.
  // Validation: lineItems doluysa sum(total) ≈ price (±1 TL tolerans).
  @Column({ type: 'simple-json', nullable: true })
  lineItems: Array<{ label: string; qty: number; unitPrice: number; total: number }> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
