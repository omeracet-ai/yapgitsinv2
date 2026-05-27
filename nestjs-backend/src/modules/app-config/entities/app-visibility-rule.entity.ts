import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('app_visibility_rules')
export class AppVisibilityRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  moduleKey: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'simple-json', nullable: true })
  roles: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  devices: string[] | null;

  @Column({ type: 'datetime', nullable: true })
  activeFrom: Date | null;

  @Column({ type: 'datetime', nullable: true })
  activeUntil: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
