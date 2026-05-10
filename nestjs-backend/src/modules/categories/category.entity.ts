import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Kategori grup sabitleri (Airtasker / HiPages ilham alınarak)
 * Her kategori bir üst gruba bağlıdır.
 */
export const CATEGORY_GROUPS = {
  EV_YASAM: 'Ev & Yaşam',
  YAPI: 'Yapı & Tesisat',
  DIJITAL: 'Dijital & Teknik',
  ETKINLIK: 'Etkinlik & Yaşam',
  ARAC: 'Araç & Taşıt',
} as const;

export type CategoryGroup =
  (typeof CATEGORY_GROUPS)[keyof typeof CATEGORY_GROUPS];

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Üst grup adı — Airtasker/HiPages tarzı hiyerarşi.
   * Örn: "Ev & Yaşam", "Yapı & Tesisat", "Dijital & Teknik"
   */
  @Column({ type: 'varchar', length: 60, nullable: true })
  group: string | null;

  /** Alt hizmetler: ["Ev Temizliği","Ofis Temizliği","Derin Temizlik"] */
  @Column({ type: 'simple-json', nullable: true })
  subServices: string[] | null;

  /** Ortalama fiyat aralığı (TL) */
  @Column({ type: 'integer', nullable: true })
  avgPriceMin: number | null;

  @Column({ type: 'integer', nullable: true })
  avgPriceMax: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
