import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Phase 276 — All-Pages Registry.
 *
 * Single source of truth for every Flutter screen that should be reachable.
 * Admin can toggle visibility, edit metadata, add new screens, or remove
 * them. Flutter app reads the public-facing slice (`key`, `visible`,
 * `sortOrder`) and applies a router guard.
 */
@Entity('app_screens')
export class AppScreen {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  iconName: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  category: string | null;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  previewImageUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
