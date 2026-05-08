import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryColumn({ type: 'varchar', length: 3 })
  code: string;

  @Column({ type: 'varchar', length: 5 })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  // Çevrim oranı: 1 TRY (base) kaç birim hedef currency eder.
  // Örn: USD rateToBase = 0.029  → 1 TL ≈ 0.029 USD
  @Column({ type: 'float', default: 1 })
  rateToBase: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
