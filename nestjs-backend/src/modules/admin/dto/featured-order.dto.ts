import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class FeaturedOrderDto {
  @ValidateIf((_o, v) => v !== null)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  featuredOrder: number | null;
}
