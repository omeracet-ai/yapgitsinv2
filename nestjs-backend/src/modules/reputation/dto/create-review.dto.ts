import { IsInt, Min, Max, IsString, IsOptional, IsUUID } from 'class-validator';

/**
 * Phase 165 — Submit a review for a completed job
 */
export class CreateReviewDto {
  @IsUUID()
  revieweeId: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
