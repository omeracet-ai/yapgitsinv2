import { IsEmail, MaxLength } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/forgot-password body validation. */
export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
