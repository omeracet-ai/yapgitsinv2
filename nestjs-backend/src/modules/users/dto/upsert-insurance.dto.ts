import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertInsuranceBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  policyNumber: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  provider: string;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  coverageAmount: number;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  documentUrl?: string | null;
}
