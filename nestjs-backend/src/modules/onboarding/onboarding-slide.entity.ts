import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('onboarding_slides')
export class OnboardingSlide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Emoji — imageUrl yoksa gösterilir */
  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji: string | null;

  /** Yüklenen görsel URL'i */
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** CSS renk kodu, örn: #007DFE */
  @Column({ type: 'varchar', length: 20, default: '#007DFE' })
  gradientStart: string;

  @Column({ type: 'varchar', length: 20, default: '#0056B3' })
  gradientEnd: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
