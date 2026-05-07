import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('job_templates')
export class JobTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 200 })
  location: string;

  @Column({ type: 'float', nullable: true })
  budgetMin: number | null;

  @Column({ type: 'float', nullable: true })
  budgetMax: number | null;

  @Column({ type: 'simple-json', nullable: true })
  photos: string[] | null;

  @Column({ type: 'int', default: 0 })
  useCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
