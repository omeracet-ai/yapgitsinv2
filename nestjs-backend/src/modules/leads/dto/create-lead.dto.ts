import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  Matches,
  IsIn,
  IsUUID,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @Length(2, 100)
  name: string;

  // Türkiye GSM: 5 ile başlayan 10 haneli (5XXXXXXXXX). +90 / 0 prefix kabul.
  @IsString()
  @Matches(/^(\+90|0)?5\d{9}$/, { message: 'Geçerli bir telefon numarası giriniz (5XXXXXXXXX)' })
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @Length(10, 2000)
  message: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @IsOptional()
  @IsUUID()
  targetWorkerId?: string;

  @IsOptional()
  @IsIn(['landing', 'category', 'worker_profile', 'job_detail'])
  source?: 'landing' | 'category' | 'worker_profile' | 'job_detail';

  // Honeypot — should always be empty. Spam bots fill it.
  @IsOptional()
  @IsString()
  website?: string;
}
