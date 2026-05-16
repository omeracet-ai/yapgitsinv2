import { IsString, IsUrl, MaxLength } from 'class-validator';

export class PortfolioUrlDto {
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  url: string;
}
