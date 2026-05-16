import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Phase 229B (Voldi-fs) — POST /auth/firebase request body validation.
 *
 * Önceki davranış: controller `{ idToken: string }` inline tipiyle çalışıyordu,
 * boş/yanlış body service-level guard'a düşüp 401 dönüyordu (yanıltıcı).
 * Şimdi: ValidationPipe boş/yanlış body için 400 döndürür.
 *
 * MaxLength(4096): Firebase ID token tipik 700-1500 char; 4 KB güvenli üst sınır
 * (DoS/log-flood koruması — uzun string'lerle bcrypt benzeri pahalı path tetiklenmez).
 */
export class FirebaseLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken!: string;
}
