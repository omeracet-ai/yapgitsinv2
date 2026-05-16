import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DataDeletionActionDto {
  @IsIn(['approve', 'reject'] as const)
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
