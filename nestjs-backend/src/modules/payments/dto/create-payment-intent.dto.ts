import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { PaymentMethod } from '../payment.entity';

export class CreatePaymentIntentDto {
  @IsString()
  workerId: string;

  @IsNumber()
  amountMinor: number; // Amount in minor units (cents)

  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string; // Default: 'TRY'

  @IsString()
  @IsOptional()
  method?: PaymentMethod; // Default: 'card'

  @IsEmail()
  @IsOptional()
  receiptEmail?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
