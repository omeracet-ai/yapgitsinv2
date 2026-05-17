import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Phase 248-FU (Voldi-fs) — iyzico 3DS bank callback.
 *
 * iyzipay 3DS akışında banka, ACS sayfasından sonra **iyzipay'in callbackUrl'ine**
 * `application/x-www-form-urlencoded` POST eder. Server tarafında bu request'i
 * yakalayıp `iyzipay.threedsPayment.create({ paymentId, conversationId })` ile
 * finalize ediyoruz.
 */
export class ThreeDsCallbackDto {
  @IsString()
  @MaxLength(64)
  paymentId!: string;

  @IsString()
  @MaxLength(128)
  conversationId!: string;

  /** '1' = 3DS başarılı, diğerleri başarısız. */
  @IsOptional()
  @IsString()
  @MaxLength(2)
  mdStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  conversationData?: string;

  /** HMAC-SHA1(secretKey, conversationId+paymentId) base64. iyzipay imzası. */
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
