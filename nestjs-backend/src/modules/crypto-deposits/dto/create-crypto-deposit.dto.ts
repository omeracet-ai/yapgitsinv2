import {
  IsNumber,
  IsPositive,
  IsString,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
} from 'class-validator';

export class CreateCryptoDepositDto {
  /** Gönderilen USDT tutarı (beyan). */
  @IsNumber()
  @IsPositive({ message: 'Tutar 0’dan büyük olmalı' })
  amountUsdt: number;

  /** TRON işlem hash'i (TxID). */
  @IsString()
  @MinLength(10, { message: 'Geçerli bir işlem hash (TxID) girin' })
  @MaxLength(100)
  txId: string;

  /** Yüklenmek istenen Kredi miktarı. */
  @IsInt()
  @Min(1, { message: 'Kredi miktarı en az 1 olmalı' })
  creditAmount: number;

  /** Amaç: 'token' (jeton satın alma) | 'wallet' (cüzdan kredisi). */
  @IsOptional()
  @IsIn(['token', 'wallet'])
  purpose?: 'token' | 'wallet';
}
