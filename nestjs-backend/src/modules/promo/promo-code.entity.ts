import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PromoDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export enum PromoAppliesTo {
  TOKENS = 'tokens',
  OFFER = 'offer',
  ALL = 'all',
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({
    type: 'simple-enum',
    enum: PromoDiscountType,
    default: PromoDiscountType.PERCENT,
  })
  discountType: PromoDiscountType;

  @Column({ type: 'float' })
  discountValue: number;

  @Column({ type: 'integer', nullable: true })
  maxRedemptions: number | null;

  @Column({ type: 'integer', default: 0 })
  redeemedCount: number;

  @Column({ type: 'float', nullable: true })
  minSpend: number | null;

  @Column({ type: 'datetime', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'datetime', nullable: true })
  validUntil: Date | null;

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({
    type: 'simple-enum',
    enum: PromoAppliesTo,
    default: PromoAppliesTo.ALL,
  })
  appliesTo: PromoAppliesTo;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
