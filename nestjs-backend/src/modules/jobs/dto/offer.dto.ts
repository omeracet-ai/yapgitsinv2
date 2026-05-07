import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OfferLineItemDto {
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
}

export class CounterOfferDto {
  @IsNumber()
  @Min(0)
  counterPrice: number;

  @IsString()
  counterMessage: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferLineItemDto)
  lineItems?: OfferLineItemDto[];
}
