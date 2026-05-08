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

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

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

  // Haftalık müsaitlik takvimi — null = "her gün müsait" varsayımı
  // Format: { mon, tue, wed, thu, fri, sat, sun: boolean }
  @Column({ type: 'simple-json', nullable: true })
  availabilitySchedule: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  } | null;

  // ── Tasker skills (Airtasker-style) ──────────────────────────────────────
  // Granular yetenek etiketleri — workerCategories'tan ayrı, daha spesifik.
  // Örnek: workerCategories=['Temizlik'] + workerSkills=['Derin Temizlik','Cam Silme','Halı Yıkama']
  // Tasker kendi profilinden veya admin atayabilir.
  @Column({ type: 'simple-json', nullable: true })
  workerSkills: string[] | null;

  // ── Airtasker-style rozetler ─────────────────────────────────────────────
  // Admin'in atadığı manuel rozetler:
  //   insurance       → İş sigortalı
  //   premium         → Premium üye (ücretli plan)
  //   partner         → Yapgitsin onaylı partner
  //   verified_business → Şirket ünvanı doğrulanmış
  // Türetilen rozetler (top_rated, reliable, rookie, power_tasker)
  // istatistiklerden anlık hesaplanır — bu listeye eklenmez.
  @Column({ type: 'simple-json', nullable: true })
  badges: string[] | null;

  // Phase 43 — Worker portfolio photos (max 10, kendi yönettiği)
  @Column({ type: 'simple-json', nullable: true })
  portfolioPhotos: string[] | null;

  // Ortalama yanıt süresi (dk) — fast_responder rozeti için.
  // Mesaj/teklif zaman damgalarından hesaplanabilir; null = yeterli veri yok.
  @Column({ type: 'integer', nullable: true })
  responseTimeMinutes: number | null;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  lastLocationAt: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  twoFactorSecret: string | null;

  // ── Phase 47 — Suspension/Ban ─────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  suspended: boolean;

  @Column({ type: 'text', nullable: true })
  suspendedReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  suspendedBy: string | null;

  // ── Phase 60 — Account self-deletion (KVKK) ──────────────────────────────
  @Column({ type: 'boolean', default: false })
  deactivated: boolean;

  @Column({ type: 'datetime', nullable: true })
  deactivatedAt: Date | null;

  // ── Phase 49 — Notification preferences (null = all enabled) ─────────────
  @Column({ type: 'simple-json', nullable: true })
  notificationPreferences: {
    booking: boolean;
    offer: boolean;
    review: boolean;
    message: boolean;
    system: boolean;
  } | null;

  // ── Phase 51 — Worker offer templates (max 5, each up to 500 chars) ──────
  @Column({ type: 'simple-json', nullable: true })
  offerTemplates: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
