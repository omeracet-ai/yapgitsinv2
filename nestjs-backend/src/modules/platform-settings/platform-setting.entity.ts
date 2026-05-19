import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Phase 254a — Admin-configurable platform settings (e.g. QR escrow commission %).
 * Key/value store with audit (updatedBy = admin user id).
 */
@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  updatedBy: string | null;
}
