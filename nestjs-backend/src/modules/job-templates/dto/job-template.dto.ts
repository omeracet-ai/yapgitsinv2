import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateJobTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class UpdateJobTemplateDto extends PartialType(CreateJobTemplateDto) {}
