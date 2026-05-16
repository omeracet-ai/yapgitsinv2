import { IsInt, Max, Min } from 'class-validator';

/**
 * Phase 244 (Voldi-fs) — POST /jobs/:id/boost body validation.
 * Önceki: `body: { days: number }` — string/negatif/100000 day kabul edilebilirdi.
 * Şimdi: 1-30 gün arası integer.
 */
export class BoostJobDto {
  @IsInt()
  @Min(1)
  @Max(30)
  days!: number;
}
