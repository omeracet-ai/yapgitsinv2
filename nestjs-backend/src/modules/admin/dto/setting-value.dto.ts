import { IsString, MaxLength } from 'class-validator';

export class SettingValueDto {
  @IsString()
  @MaxLength(10000)
  value: string;
}
