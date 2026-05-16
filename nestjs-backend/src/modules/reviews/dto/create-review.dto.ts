import {
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

/**
 * Phase 240B (Voldi-fs): CreateReviewDto — mass-assignment fix.
 *
 * Önce: controller @Body() data: Record<string, unknown> → istemci
 * `flagged`, `fraudScore`, `helpfulCount`, `reviewerId` enjekte edebiliyordu.
 *
 * Şimdi: sadece whitelist alanlar geçer; reviewerId server-side JWT'den.
 * Global ValidationPipe `whitelist: true` ile bilinmeyen alanlar strip edilir.
 */
export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @IsUUID()
  jobId!: string;

  @IsUUID()
  revieweeId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(3)
  photos?: string[];
}
