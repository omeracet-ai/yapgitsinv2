import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WithdrawalStatus } from '../withdrawal-request.entity';

export class UpdateWithdrawalStatusDto {
  @IsEnum(WithdrawalStatus)
  status!: WithdrawalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
