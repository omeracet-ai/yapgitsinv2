import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScreenDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'key must be lowercase alphanumeric + underscore',
  })
  key: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  iconName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewImageUrl?: string | null;
}

export class UpdateScreenDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  iconName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  previewImageUrl?: string | null;
}
