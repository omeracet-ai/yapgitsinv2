import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * Phase 123 — SMS OTP storage
 */
@Entity('sms_otps')
@Index(['phoneNumber', 'createdAt'])
export class SmsOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 6 })
  code!: string;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
