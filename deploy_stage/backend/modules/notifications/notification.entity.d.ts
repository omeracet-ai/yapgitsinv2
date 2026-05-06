import { User } from '../users/user.entity';
export declare enum NotificationType {
    BOOKING_REQUEST = "booking_request",
    BOOKING_CONFIRMED = "booking_confirmed",
    BOOKING_CANCELLED = "booking_cancelled",
    BOOKING_COMPLETED = "booking_completed",
    NEW_OFFER = "new_offer",
    OFFER_ACCEPTED = "offer_accepted",
    OFFER_REJECTED = "offer_rejected",
    NEW_REVIEW = "new_review",
    SYSTEM = "system"
}
export declare class Notification {
    id: string;
    userId: string;
    user: User;
    type: NotificationType;
    title: string;
    body: string;
    refId: string | null;
    isRead: boolean;
    createdAt: Date;
}
