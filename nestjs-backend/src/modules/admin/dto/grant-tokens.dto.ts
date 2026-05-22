import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';

/**
 * Phase 260 — Admin manuel jeton tanımlama / düzeltme.
 * `amount` pozitif = jeton ekle, negatif = düzeltme amaçlı düş (bakiye floor 0).
 * Serbest kullanıcı satın alma kaldırıldı; jeton satın alma yalnızca iyzipay üzerinden.
 */
export class GrantTokensDto {
  @IsInt()
  @NotEquals(0, { message: 'amount 0 olamaz' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
