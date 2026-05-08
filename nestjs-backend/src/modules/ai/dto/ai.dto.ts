import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';

export class GenerateJobDescriptionDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsOptional() location?: string;
}

export class AiChatDto {
  @IsString() @IsNotEmpty() message: string;
  @IsArray() @IsOptional() history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export class SummarizeReviewsDto {
  @IsArray() @IsNotEmpty() reviews: string[];
}

export class JobAssistantDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() location?: string;
  @IsNumber() @IsOptional() budgetHint?: number;
}

export class PricingAdvisorDto {
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsNotEmpty() jobDetails: string;
  @IsString() @IsOptional() location?: string;
}

export class SupportAgentDto {
  @IsString() @IsNotEmpty() message: string;
  @IsArray() @IsOptional() history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export class GenerateCategoryDescriptionDto {
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() length?: 'short' | 'medium' | 'long';
}
