import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AvailabilityDayDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(HH_MM, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(HH_MM, { message: 'endTime must be HH:MM' })
  endTime: string;

  @IsBoolean()
  isAvailable: boolean;
}

export class BulkAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days: AvailabilityDayDto[];
}
