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
import { ServiceRequest } from './service-request.entity';
import { User } from '../users/user.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('service_request_applications')
@Index('idx_sr_apps_serviceRequestId_status', ['serviceRequestId', 'status'])
@Index('idx_sr_apps_userId_status', ['userId', 'status'])
export class ServiceRequestApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 36 })
  serviceRequestId: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'serviceRequestId' })
  serviceRequest: ServiceRequest;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'float', nullable: true })
  price: number | null;

  @Column({
    type: 'simple-enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
