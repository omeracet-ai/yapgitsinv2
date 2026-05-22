import { IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';

export class ReviewCryptoDepositDto {
  /** Admin notu (red sebebi veya onay açıklaması). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Onayda yüklenecek Kredi'yi override et (boşsa talepteki creditAmount kullanılır). */
  @IsOptional()
  @IsInt()
  @Min(1)
  creditAmount?: number;
}
