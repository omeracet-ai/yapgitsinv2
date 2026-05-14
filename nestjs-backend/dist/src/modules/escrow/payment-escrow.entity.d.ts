export declare enum EscrowStatus {
    HELD = "HELD",
    RELEASED = "RELEASED",
    REFUNDED = "REFUNDED",
    DISPUTED = "DISPUTED",
    PARTIAL_REFUND = "PARTIAL_REFUND"
}
export declare class PaymentEscrow {
    id: string;
    jobId: string;
    offerId: string;
    customerId: string;
    taskerId: string;
    amount: number;
    platformFeePct: number;
    platformFeeAmount: number | null;
    taskerNetAmount: number | null;
    amountMinor: number;
    platformFeeMinor: number;
    workerPayoutMinor: number;
    currency: string;
    status: EscrowStatus;
    paymentRef: string | null;
    paymentProvider: string;
    paymentToken: string | null;
    paymentTxnId: string | null;
    paymentStatus: string;
    refundNeedsAttention: boolean;
    refundAmount: number | null;
    releaseReason: string | null;
    refundReason: string | null;
    disputeReason: string | null;
    heldAt: Date;
    releasedAt: Date | null;
    refundedAt: Date | null;
    disputedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
