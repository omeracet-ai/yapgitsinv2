import { IsObject, IsOptional } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown> | null;
}
