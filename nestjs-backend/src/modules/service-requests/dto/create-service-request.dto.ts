import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Phase 244 (Voldi-fs) — POST /service-requests body validation.
 *
 * Mass-assignment koruması: önceki controller `Record<string, unknown>` ile
 * keyfi field'ları service.create()'e iletiyordu (örn. userId override,
 * featuredOrder override). Şimdi yalnızca whitelist'teki alanlar kabul edilir
 * (global `forbidNonWhitelisted: true` ekstra alanı 400 ile reddeder).
 *
 * userId, tenantId, geohash, priceMinor, status, featuredOrder server-side
 * yönetilir — bu DTO'da yer almaz.
 */
export class CreateServiceRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
