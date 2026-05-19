import { IsInt, IsString, Matches, Min, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateWithdrawalDto {
  // 5000 = 50 TL minimum
  @IsInt()
  @Min(5000)
  amountMinor!: number;

  // TR + 24 digits = 26 chars total
  @IsString()
  @Matches(/^TR\d{24}$/i, { message: 'IBAN formatı hatalı (TR + 24 hane)' })
  iban!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  accountHolderName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  workerNote?: string;
}
