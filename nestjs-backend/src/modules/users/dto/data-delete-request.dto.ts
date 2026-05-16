import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DataDeleteRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
