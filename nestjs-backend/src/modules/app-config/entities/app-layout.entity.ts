import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('app_layouts')
export class AppLayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  screen: string;

  @Column({ type: 'varchar', length: 50 })
  componentKey: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ type: 'text', nullable: true })
  props: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
