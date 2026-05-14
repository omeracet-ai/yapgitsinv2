export declare class RefundPaymentDto {
    paymentId: string;
    amountMinor?: number;
    reason?: string;
}
export declare class RefundResponseDto {
    id: string;
    paymentId: string;
    refundId: string | null;
    amountMinor: number;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
}
