import { PaymentMethod } from '../payment.entity';
export declare class CreatePaymentIntentDto {
    workerId: string;
    amountMinor: number;
    bookingId?: string;
    description?: string;
    currency?: string;
    method?: PaymentMethod;
    receiptEmail?: string;
    idempotencyKey?: string;
}
