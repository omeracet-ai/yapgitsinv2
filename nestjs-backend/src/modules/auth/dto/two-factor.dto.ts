import { IsString, Length, MaxLength, IsNotEmpty } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/2fa/enable body validation. */
export class Enable2faDto {
  @IsString()
  @Length(6, 6, { message: 'code 6 haneli olmalı' })
  code!: string;
}

/** Phase 244 (Voldi-fs) — POST /auth/2fa/disable body validation. */
export class Disable2faDto {
  @IsString()
  @Length(6, 6, { message: 'code 6 haneli olmalı' })
  code!: string;
}

/** Phase 244 (Voldi-fs) — POST /auth/2fa/login-verify body validation. */
export class LoginVerify2faDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  tempToken!: string;

  @IsString()
  @Length(6, 6, { message: 'code 6 haneli olmalı' })
  code!: string;
}
