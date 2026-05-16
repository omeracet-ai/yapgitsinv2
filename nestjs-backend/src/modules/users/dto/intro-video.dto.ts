import { IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class IntroVideoDto {
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  url: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  duration?: number | null;
}
