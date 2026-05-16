import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Phase 244 (Voldi-fs) — POST /auth/register body validation.
 *
 * - phoneNumber zorunlu (service uniqueness check buna güvenir).
 * - email opsiyonel (telefonla kayıt da destekleniyor); verilirse format zorunlu.
 * - password min 6 char (mevcut bcrypt akışıyla uyumlu; sıkılaştırmayı sonraki phase'e bıraktım).
 * - phoneNumber: E.164-lite — opsiyonel '+', 10-15 digit (TR + uluslararası destek).
 */
export class RegisterDto {
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phoneNumber 10-15 rakam, baş + opsiyonel olmalı',
  })
  @MaxLength(20)
  phoneNumber!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
