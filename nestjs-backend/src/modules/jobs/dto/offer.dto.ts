import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizeHtml } from '../../../common/decorators/sanitize-html.decorator';

export class OfferLineItemDto {
  @SanitizeHtml()
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  total: number;
}

export class CreateOfferDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @SanitizeHtml()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferLineItemDto)
  lineItems?: OfferLineItemDto[];

  // Phase 316 — Usta opsiyonel tarih/saat önerisi (ilan flexible/urgent ise).
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate YYYY-MM-DD olmalı' })
  proposedDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'proposedTime HH:MM olmalı' })
  proposedTime?: string;
}

export class CounterOfferDto {
  @IsNumber()
  @Min(0)
  counterPrice: number;

  @SanitizeHtml()
  @IsString()
  counterMessage: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferLineItemDto)
  lineItems?: OfferLineItemDto[];
}
