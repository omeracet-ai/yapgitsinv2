import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('worker_certifications')
export class WorkerCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  issuer: string;

  @Column({ type: 'date' })
  issuedAt: Date;

  @Column({ type: 'date', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  documentUrl: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  verifiedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
