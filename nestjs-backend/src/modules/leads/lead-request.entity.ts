import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'spam';
export type LeadSource = 'landing' | 'category' | 'worker_profile' | 'job_detail';

@Entity('lead_requests')
export class LeadRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  targetWorkerId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'landing' })
  source: LeadSource;

  @Index()
  @Column({ type: 'simple-enum', enum: ['new', 'contacted', 'converted', 'spam'], default: 'new' })
  status: LeadStatus;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  contactedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
