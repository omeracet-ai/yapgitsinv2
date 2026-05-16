import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/reset-password body validation. */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword!: string;
}
