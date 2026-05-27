import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LayoutItemDto {
  @IsString()
  @MaxLength(50)
  componentKey: string;

  @IsInt()
  @Min(0)
  sortOrder: number;

  @IsBoolean()
  visible: boolean;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown> | null;
}

export class ReplaceLayoutDto {
  @IsString()
  @MaxLength(50)
  screen: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutItemDto)
  items: LayoutItemDto[];
}
