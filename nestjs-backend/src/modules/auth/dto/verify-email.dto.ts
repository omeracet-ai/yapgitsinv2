import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/verify-email/confirm body validation. */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
