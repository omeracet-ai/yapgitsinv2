import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  splashUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  appTitle?: string | null;
}
