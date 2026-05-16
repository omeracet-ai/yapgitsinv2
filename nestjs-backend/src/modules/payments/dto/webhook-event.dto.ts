import {
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Phase 245 (Voldi-sec) — Generic payment provider webhook event DTO.
 *
 * `POST /payments/webhook`. Önceden `@Body() event: any` + signature
 * verification YOK → saldırgan keyfi `{ type: 'payment.completed', data: ... }`
 * postlayarak rastgele payment'ı COMPLETED yapabiliyordu (auth gate yok,
 * yalnızca paymentIntentId match'i; saldırgan brute-force / leak ile öğrenirse
 * payment hijack).
 *
 * Fix:
 *   1. DTO ile shape validation + forbidNonWhitelisted.
 *   2. `WebhookSignatureGuard` HMAC-SHA256 imza doğrulama (controller'da).
 */
export class WebhookEventDataDto {
  @IsString()
  @MaxLength(128)
  paymentIntentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  externalTransactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  error?: string;
}

export class WebhookEventDto {
  @IsString()
  @IsIn(['payment.completed', 'payment.failed'])
  type!: 'payment.completed' | 'payment.failed';

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookEventDataDto)
  data!: WebhookEventDataDto;
}
