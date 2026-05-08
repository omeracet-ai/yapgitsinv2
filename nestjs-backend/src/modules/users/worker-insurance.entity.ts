import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('worker_insurances')
@Unique('UQ_worker_insurance_user', ['userId'])
export class WorkerInsurance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  policyNumber: string;

  @Column({ type: 'varchar', length: 100 })
  provider: string;

  @Column({ type: 'float' })
  coverageAmount: number;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  documentUrl: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
