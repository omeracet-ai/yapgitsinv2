import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('availability_slots')
export class AvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  // 0 = Sunday ... 6 = Saturday
  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'varchar', length: 5 })
  startTime: string; // HH:MM

  @Column({ type: 'varchar', length: 5 })
  endTime: string; // HH:MM

  @Column({ type: 'boolean', default: true })
  isRecurring: boolean;

  @Column({ type: 'date', nullable: true })
  recurringUntil: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
