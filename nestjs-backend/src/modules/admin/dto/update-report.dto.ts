import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UserReportStatus } from '../../user-blocks/user-report.entity';

export class UpdateReportDto {
  @IsIn(['pending', 'reviewed', 'dismissed'] as const)
  status: UserReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
