import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /service-requests/:id/apply body validation. */
export class ApplyServiceRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
