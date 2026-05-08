import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  brandName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subdomain: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customDomain: string | null;

  @Column({ type: 'simple-json', nullable: true })
  theme: { primary?: string; accent?: string } | null;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  defaultCurrency: string;

  @Column({ type: 'varchar', length: 5, default: 'tr-TR' })
  defaultLocale: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
