import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { User } from '../users/user.entity';

export enum ApplicationStatus {
  PENDING  = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('service_request_applications')
export class ServiceRequestApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  serviceRequestId: string;

  @ManyToOne(() => ServiceRequest, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'serviceRequestId' })
  serviceRequest: ServiceRequest;

  @Column({ type: 'varchar' })
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
