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
import { JobLead } from './job-lead.entity';
import { User } from '../users/user.entity';

export type JobLeadResponseStatus = 'sent_email' | 'viewed' | 'contacted' | 'accepted' | 'rejected';

@Entity('lead_responses')
export class JobLeadResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  leadId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  workerId: string;

  @Index()
  @Column({ type: 'varchar', length: 50, default: 'sent_email' })
  status: JobLeadResponseStatus;

  @Column({ type: 'text', nullable: true })
  workerMessage: string | null;

  @Column({ type: 'datetime', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => JobLead, (lead) => lead.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: JobLead;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: User;
}
