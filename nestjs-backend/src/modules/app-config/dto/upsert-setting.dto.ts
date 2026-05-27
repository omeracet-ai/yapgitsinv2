import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @MaxLength(100)
  key: string;

  @IsString()
  @MaxLength(10000)
  value: string;

  @IsOptional()
  @IsIn(['string', 'number', 'boolean', 'json'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  group?: string;
}
