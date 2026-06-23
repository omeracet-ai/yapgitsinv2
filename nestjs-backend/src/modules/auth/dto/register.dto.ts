import {
  Equals,
  IsBoolean,
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
  // Phase 511 (Müdür/Voldi-fs) — phone REQUIRED again per product decision (M2).
  // Email + phone are both contactable identifiers at signup; SMS verify still
  // optional post-signup (Play Console best practice).
  // Regex accepts TR + international: optional '+', 10-15 digit.
  @IsString({ message: 'Telefon numarası zorunludur.' })
  @Matches(/^\+?[0-9()\s-]{10,16}$/, {
    message: 'Geçerli bir telefon numarası giriniz.',
  })
  @MaxLength(20)
  phoneNumber!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  // Phase 253 (Voldi-email-validate) — email now REQUIRED on register.
  // Play Console best practice: email is the primary contactable identifier;
  // SMS verify becomes an optional post-signup add-on, not a signup gate.
  // Domain-level validation (MX + disposable block + whitelist) runs in
  // AuthService.register via EmailValidatorService.
  @IsEmail({}, { message: 'E-posta adresi zorunludur.' })
  @MaxLength(254)
  email!: string;

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

  // ── Phase 256 (Voldi-fs) — KVKK Compliance consent gates ───────────────
  // KVKK aydınlatma metni + kullanım koşulları kabulü kayıt için ZORUNLU.
  // @Equals(true) → eksik/false gönderilirse 400 + Türkçe mesaj.
  // Pazarlama izni opsiyonel; consentVersion verilmezse service 'v1.0' atar.
  @Equals(true, { message: 'KVKK rızası zorunludur' })
  kvkkConsent!: boolean;

  @Equals(true, { message: 'Kullanım koşulları kabulü zorunludur' })
  termsConsent!: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  consentVersion?: string;
}
