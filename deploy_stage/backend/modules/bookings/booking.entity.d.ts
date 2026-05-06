import { User } from '../users/user.entity';
export declare enum BookingStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class Booking {
    id: string;
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
    workerNote: string | null;
    customerNote: string | null;
    createdAt: Date;
    updatedAt: Date;
}
