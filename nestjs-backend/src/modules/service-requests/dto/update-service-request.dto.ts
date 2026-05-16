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
 * Phase 244 (Voldi-fs) — PATCH /service-requests/:id body validation.
 *
 * Mass-assignment koruması: önceki controller `Record<string, unknown>` —
 * istemci `userId`, `status`, `featuredOrder` gibi sunucu yönetimindeki alanları
 * ezebiliyordu. Bu DTO whitelist'i sabitler; global `forbidNonWhitelisted: true`
 * whitelist dışını 400 ile reddeder.
 *
 * Tüm alanlar opsiyonel (PATCH partial update).
 */
export class UpdateServiceRequestDto {
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
