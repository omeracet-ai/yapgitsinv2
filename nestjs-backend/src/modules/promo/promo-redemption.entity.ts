import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity('promo_redemptions')
export class PromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  codeId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  appliedAmount: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  refType: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  refId: string | null;

  @CreateDateColumn()
  redeemedAt: Date;
}
