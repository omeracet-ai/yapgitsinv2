import { IsOptional, IsString, IsNumber } from 'class-validator';

export class PaymentHistoryQueryDto {
  @IsNumber()
  @IsOptional()
  skip?: number;

  @IsNumber()
  @IsOptional()
  take?: number;

  @IsString()
  @IsOptional()
  status?: string; // Filter by status

  @IsString()
  @IsOptional()
  startDate?: string; // ISO date string

  @IsString()
  @IsOptional()
  endDate?: string; // ISO date string

  @IsString()
  @IsOptional()
  workerId?: string; // For worker earnings view
}

export class PaymentResponseDto {
  id: string;
  customerId: string;
  workerId: string;
  bookingId: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  method: string;
  externalTransactionId: string | null;
  description: string | null;
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}
