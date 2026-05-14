export declare enum BookingEscrowStatus {
    HELD = "held",
    RELEASED = "released",
    REFUNDED = "refunded",
    CANCELLED = "cancelled"
}
export declare class BookingEscrow {
    id: string;
    bookingId: string;
    customerId: string;
    workerId: string;
    amount: number;
    status: BookingEscrowStatus;
    heldAt: Date;
    releasedAt: Date | null;
    refundedAt: Date | null;
    refundedAmount: number | null;
    createdAt: Date;
}
