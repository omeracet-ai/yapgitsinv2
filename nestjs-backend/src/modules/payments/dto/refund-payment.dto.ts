import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsString()
  paymentId: string;

  @IsNumber()
  @IsOptional()
  amountMinor?: number; // Partial refund amount in minor units (if not provided, full refund)

  @IsString()
  @IsOptional()
  reason?: string; // Refund reason
}

export class RefundResponseDto {
  id: string;
  paymentId: string;
  refundId: string | null;
  amountMinor: number;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}
