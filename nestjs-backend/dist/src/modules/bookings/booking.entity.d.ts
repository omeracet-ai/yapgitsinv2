import { User } from '../users/user.entity';
export declare enum BookingStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum CancellationReason {
    CUSTOMER_CHANGE = "customer_change",
    WORKER_UNAVAILABLE = "worker_unavailable",
    WEATHER = "weather",
    EMERGENCY = "emergency",
    OTHER = "other"
}
export declare enum RefundStatus {
    PENDING = "pending",
    PROCESSED = "processed",
    NONE = "none"
}
export declare class Booking {
    id: string;
    tenantId: string | null;
    customerId: string;
    customer: User;
    workerId: string;
    worker: User;
    category: string;
    subCategory: string | null;
    description: string;
    address: string;
    scheduledDate: string;
    scheduledTime: string | null;
    status: BookingStatus;
    agreedPrice: number | null;
    agreedPriceMinor: number | null;
    workerNote: string | null;
    customerNote: string | null;
    cancelledAt: Date | null;
    cancelledBy: string | null;
    cancellationReason: CancellationReason | null;
    refundAmount: number | null;
    refundStatus: RefundStatus | null;
    reminder24hSentAt: Date | null;
    reminder1hSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
