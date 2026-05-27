import { IsString, Length } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @Length(8, 8)
  confirmToken!: string;
}
