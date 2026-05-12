import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

export enum PromoDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export enum PromoAppliesTo {
  TOKENS = 'tokens',
  OFFER = 'offer',
  ALL = 'all',
}

// Phase 126: 4 effect kinds applied at redeem time
export enum PromoEffectType {
  BONUS_TOKEN = 'bonus_token',
  DISCOUNT_PERCENT = 'discount_percent',
  DISCOUNT_AMOUNT = 'discount_amount',
  SUBSCRIPTION_TRIAL = 'subscription_trial',
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

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  discountValue: number;

  @Column({ type: 'integer', nullable: true })
  maxRedemptions: number | null;

  @Column({ type: 'integer', default: 0 })
  redeemedCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
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

  // Phase 126
  @Column({
    type: 'simple-enum',
    enum: PromoEffectType,
    nullable: true,
  })
  effectType: PromoEffectType | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  effectValue: number | null;

  @Column({ type: 'integer', nullable: true })
  trialDays: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
