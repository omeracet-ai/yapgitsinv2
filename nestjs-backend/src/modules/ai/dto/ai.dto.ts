import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class GenerateJobDescriptionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  location?: string;
}

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @IsOptional()
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class SummarizeReviewsDto {
  @IsArray()
  @IsNotEmpty()
  reviews: string[];
}
