import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export interface SavedJobSearchCriteria {
  category?: string;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  radiusKm?: number;
  lat?: number;
  lng?: number;
}

@Entity('saved_job_searches')
export class SavedJobSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'simple-json' })
  criteria: SavedJobSearchCriteria;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastNotifiedAt: Date | null;
}
