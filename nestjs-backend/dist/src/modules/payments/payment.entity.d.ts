import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CARD = "card",
    IYZIPAY = "iyzipay",
    MOCK = "mock",
    BANK_TRANSFER = "bank_transfer"
}
export declare class Payment {
    id: string;
    tenantId: string | null;
    customerId: string;
    customer: User;
    workerId: string;
    worker: User;
    bookingId: string | null;
    booking: Booking | null;
    amountMinor: number;
    currency: string;
    status: PaymentStatus;
    method: PaymentMethod;
    externalTransactionId: string | null;
    providerRequestId: string | null;
    paymentIntentId: string | null;
    iyzipayToken: string | null;
    iyzipayPaymentId: string | null;
    escrowId: string | null;
    refundId: string | null;
    refundedAmountMinor: number | null;
    feeMinor: number | null;
    netAmountMinor: number | null;
    errorMessage: string | null;
    description: string | null;
    idempotencyKey: string | null;
    receiptEmail: string | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
}
