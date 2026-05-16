import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Phase 244 (Voldi-fs) — POST /auth/refresh body validation.
 * Önceki davranış korunur: refreshToken boş/eksikse service zaten UnauthorizedException atıyordu;
 * şimdi inline body için 400, sonra service-level 401.
 *
 * MaxLength(4096): JWT refresh token tipik ~500-800 char; 4 KB güvenli üst sınır.
 */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  refreshToken!: string;
}
