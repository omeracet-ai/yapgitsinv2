import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsObject()
  tokens: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateThemeDto {
  @IsOptional()
  @IsObject()
  tokens?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
