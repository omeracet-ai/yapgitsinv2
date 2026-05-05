import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  profileImageUrl: string;

  // Kimlik fotoğrafı (zorunlu, upload sonrası set edilir)
  @Column({ type: 'varchar', nullable: true })
  identityPhotoUrl: string;

  // Belge fotoğrafı (opsiyonel)
  @Column({ type: 'varchar', nullable: true })
  documentPhotoUrl: string;

  @Column({ type: 'boolean', default: false })
  identityVerified: boolean;

  // Kişisel bilgiler
  @Column({ type: 'varchar', length: 10, nullable: true })
  birthDate: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string; // 'male' | 'female' | 'other'

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'float', default: 100 })
  tokenBalance: number;

  // ── Hizmet Alan (customer) istatistikleri ──────────────────────────────
  @Column({ type: 'integer', default: 0 })
  asCustomerTotal: number;

  @Column({ type: 'integer', default: 0 })
  asCustomerSuccess: number;

  @Column({ type: 'integer', default: 0 })
  asCustomerFail: number;

  // ── Hizmet Veren (worker) istatistikleri ───────────────────────────────
  @Column({ type: 'integer', default: 0 })
  asWorkerTotal: number;

  @Column({ type: 'integer', default: 0 })
  asWorkerSuccess: number;

  @Column({ type: 'integer', default: 0 })
  asWorkerFail: number;

  // ── Puan sistemi ────────────────────────────────────────────────────────
  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  totalReviews: number;

  @Column({ type: 'integer', default: 0 })
  reputationScore: number;

  // ── Usta profili (worker) ────────────────────────────────────────────────
  // Hangi kategorilerde hizmet verdiği: ["Temizlik","Elektrikçi"]
  @Column({ type: 'simple-json', nullable: true })
  workerCategories: string[] | null;

  // Kısa biyografi / hizmet tanımı
  @Column({ type: 'text', nullable: true })
  workerBio: string | null;

  // Fiyat aralığı (saat başı veya iş başı, TL)
  @Column({ type: 'float', nullable: true })
  hourlyRateMin: number | null;

  @Column({ type: 'float', nullable: true })
  hourlyRateMax: number | null;

  // Hizmet yarıçapı (km) – konum bazlı eşleşme için
  @Column({ type: 'integer', default: 20 })
  serviceRadiusKm: number;

  // Müsaitlik durumu: true = aktif olarak iş alıyor
  @Column({ type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  lastLocationAt: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
