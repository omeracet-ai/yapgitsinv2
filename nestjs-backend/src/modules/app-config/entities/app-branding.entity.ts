import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('app_brandings')
export class AppBranding {
  @PrimaryColumn({ type: 'varchar', length: 50, default: 'default' })
  id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  splashUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  appTitle: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
