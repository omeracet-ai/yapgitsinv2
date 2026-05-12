import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { JobLeadResponse } from './job-lead-response.entity';

export type JobLeadStatus = 'open' | 'in_progress' | 'closed' | 'expired';

@Entity('leads')
export class JobLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  city: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', nullable: true })
  budgetMin: number | null;

  @Column({ type: 'integer', nullable: true })
  budgetMax: number | null;

  @Column({ type: 'boolean', default: false })
  budgetVisible: boolean;

  @Column({ type: 'varchar', length: 100, nullable: false })
  requesterName: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  requesterPhone: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  requesterEmail: string;

  @Column({ type: 'varchar', length: 50, default: 'flexible' })
  preferredContactTime: 'today' | 'this_week' | 'flexible';

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: JobLeadStatus;

  @Column({ type: 'text', nullable: true })
  attachments: string | null; // JSON array of photo URLs

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: User | null;

  @OneToMany(() => JobLeadResponse, (response) => response.lead, { cascade: true })
  responses: JobLeadResponse[];
}
