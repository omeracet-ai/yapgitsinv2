import { IsString, MaxLength, MinLength } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/admin/login body validation. */
export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
