import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id  (işçi/worker'ın user kaydı) */
  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  businessName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'float', default: 0.0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  /** Mavi tik: admin onayından sonra true */
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  /** Admin tarafından öne çıkarılan slot: 1, 2, 3 ya da null */
  @Column({ type: 'integer', nullable: true, default: null })
  featuredOrder: number | null;

  /** Yeterlilik belgeleri: { certificateUrl, identityUrl, tradeRegistryUrl } */
  @Column({ type: 'simple-json', nullable: true })
  documents: Record<string, string> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
