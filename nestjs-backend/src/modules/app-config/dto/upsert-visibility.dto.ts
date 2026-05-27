import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpsertVisibilityDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  devices?: string[] | null;

  @IsOptional()
  @IsDateString()
  activeFrom?: string | null;

  @IsOptional()
  @IsDateString()
  activeUntil?: string | null;
}
