import { IsString, Length, Matches } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @Matches(/^backup-[\d-]+\.sqlite$/, {
    message: 'Geçersiz yedek dosyası adı',
  })
  filename!: string;

  @IsString()
  @Length(8, 8)
  confirmToken!: string;
}
