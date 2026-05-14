export declare class PaymentHistoryQueryDto {
    skip?: number;
    take?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    workerId?: string;
}
export declare class PaymentResponseDto {
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
