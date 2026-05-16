import { IsString, Length, Matches, MaxLength } from 'class-validator';

/** Phase 244 (Voldi-fs) — POST /auth/sms/request body validation. */
export class RequestSmsOtpDto {
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phoneNumber 10-15 rakam, baş + opsiyonel olmalı',
  })
  @MaxLength(20)
  phoneNumber!: string;
}

/** Phase 244 (Voldi-fs) — POST /auth/sms/verify body validation. */
export class VerifySmsOtpDto {
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'phoneNumber 10-15 rakam, baş + opsiyonel olmalı',
  })
  @MaxLength(20)
  phoneNumber!: string;

  @IsString()
  @Length(6, 6, { message: 'code 6 haneli olmalı' })
  code!: string;
}
