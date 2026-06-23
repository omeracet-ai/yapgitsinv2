import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Phase 254b — Platform komisyon yüzdesi (QR/escrow akışında kullanılır).
 * 0..100 arası ondalık değer (örn. 1.5 → %1.5).
 *
 * Phase 510 — Token ekonomisi alanları eklendi. Tümü opsiyonel: PATCH yalnız
 * gönderilen alanları yazar. Mod 'flat' → offerTokenCost SABİT kredi; 'percent'
 * → offerTokenCost = % değeri. Cost daima [min..max] aralığına clamp edilir.
 */
export class UpdateCommissionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPctQr?: number;

  @IsOptional()
  @IsIn(['flat', 'percent'])
  offerTokenCostMode?: 'flat' | 'percent';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  offerTokenCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  offerTokenCostMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  offerTokenCostMax?: number;
}
