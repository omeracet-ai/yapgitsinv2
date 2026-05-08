import { Equals, IsBoolean, IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurgeAuditLogDto {
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(365)
  olderThanDays: number;

  @IsBoolean()
  @Equals(true)
  confirm: true;
}
