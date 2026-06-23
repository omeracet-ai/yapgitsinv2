import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

/**
 * Phase 519 (Voldi-sec) — POST /bookings body DTO + XSS sanitize.
 *
 * Önce: controller `@Body() body: { ... }` inline type → ValidationPipe pas
 * geçiyordu, free-text alanlar (description, address, customerNote) HTML
 * payload kabul ediyordu (stored XSS riski).
 */
export class CreateBookingDto {
  @IsUUID()
  workerId!: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(100)
  subCategory?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate YYYY-MM-DD olmalı' })
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime HH:MM olmalı',
  })
  scheduledTime?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(2000)
  customerNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedPrice?: number;
}

/** Phase 519 — PATCH /bookings/:id/status (workerNote dahil). */
export class UpdateBookingStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(2000)
  workerNote?: string;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  @MaxLength(2000)
  customerNote?: string;
}
