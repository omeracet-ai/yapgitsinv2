import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'fraud',
  'inappropriate',
  'fake_profile',
  'inappropriate_content',
  'other',
] as const;

export class ReportUserDto {
  @IsEnum(REPORT_REASONS)
  reason: (typeof REPORT_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateReportStatusDto {
  @IsEnum(['reviewed', 'dismissed'] as const)
  status: 'reviewed' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
