import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * Phase 245 (Voldi-sec) — Iyzipay checkout form callback body.
 *
 * iyzipay ödeme sayfasında müşteri ödedikten sonra **iyzipay'in sunucusu**
 * tarafımıza POST eder: `{ token: '...' }`. Token server-side re-verify
 * (retrieveCheckout) ile doğrulanır — bu, saldırgan bir kullanıcının
 * keyfi token uydurmasını engelleyen ASIL güvenlik katmanıdır.
 *
 * DTO görevi: shape validation + forbidNonWhitelisted kazancı (önceden
 * `Record<string,string>` idi — herhangi bir key kabul ediyordu).
 */
export class IyzipayCallbackDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  /** iyzipay bazen ek alanlar (conversationId, status) postalayabilir. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;
}
