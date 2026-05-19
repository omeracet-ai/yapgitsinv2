import { IsNumber, Max, Min } from 'class-validator';

/**
 * Phase 254b — Platform komisyon yüzdesi (QR/escrow akışında kullanılır).
 * 0..100 arası ondalık değer (örn. 1.5 → %1.5).
 */
export class UpdateCommissionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPctQr: number;
}
