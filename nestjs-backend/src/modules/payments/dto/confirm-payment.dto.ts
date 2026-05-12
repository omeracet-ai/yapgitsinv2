import { IsString, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsString()
  @IsOptional()
  token?: string; // Card token or provider token

  @IsString()
  @IsOptional()
  providerTransactionId?: string; // External transaction ID from provider
}
