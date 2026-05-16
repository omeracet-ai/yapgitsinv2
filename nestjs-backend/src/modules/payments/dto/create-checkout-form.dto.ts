import {
  IsString,
  IsOptional,
  IsNumberString,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Phase 245 (Voldi-sec) — `POST /payments/create-session` body DTO.
 *
 * Legacy Iyzipay Checkout Form initiation. Önceden `@Body() body: any` — full
 * any cast → forbidNonWhitelisted bypass + free-form keyfi alanlar (price,
 * paidPrice, userId, identityNumber injection vektörü) idi.
 *
 * Tüm alanlar opsiyonel ve dar tipli: backend tarafı çoğu sahayı
 * `payments.service.createCheckoutForm` içinde fallback değerleriyle dolduruyor;
 * client sadece sipariş bilgilerini iletir. user.identityNumber gibi PII
 * alanlarını client'tan kabul etmiyoruz — sabit fallback kullanılıyor.
 */
export class CheckoutFormBuyerDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  surname?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(256)
  email?: string;
}

export class CreateCheckoutFormDto {
  /** Toplam ürün fiyatı — iyzipay SDK string ister. "150.00" gibi. */
  @IsNumberString()
  @MaxLength(20)
  price!: string;

  /** Komisyon sonrası ödenecek fiyat — genelde price ile aynı. */
  @IsNumberString()
  @MaxLength(20)
  paidPrice!: string;

  /** Sepet/iş id'si — basketId olarak iyzipay'e geçer. */
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'basketId yalnızca harf/rakam/-/_ içerebilir',
  })
  basketId!: string;

  /** Alıcı bilgileri — tüm alanlar opsiyonel, server-side fallback var. */
  @IsOptional()
  user?: CheckoutFormBuyerDto;
}
