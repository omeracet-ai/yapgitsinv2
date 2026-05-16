import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Phase 244 (Voldi-fs) — POST /auth/login body validation.
 * Önceki: inline `{ email, password }` — ValidationPipe boş body'yi geçiriyordu,
 * service'te `undefined.email` 500 üretebiliyordu. Şimdi: 400 + temiz hata.
 *
 * MaxLength(128): bcrypt input ceiling (DoS koruması — uzun string'lerle pahalı hash path tetiklenmesin).
 */
export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
