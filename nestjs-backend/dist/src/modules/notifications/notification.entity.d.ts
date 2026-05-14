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
    SYSTEM = "system",
    COUNTER_OFFER = "counter_offer",
    OFFER_EXPIRED = "offer_expired",
    DISPUTE_OPENED = "dispute_opened",
    DISPUTE_RESOLVED = "dispute_resolved",
    JOB_PENDING_COMPLETION = "job_pending_completion",
    JOB_COMPLETED = "job_completed",
    JOB_CANCELLED = "job_cancelled",
    REVIEW_REMINDER = "review_reminder",
    SAVED_SEARCH_MATCH = "saved_search_match"
}
export declare class Notification {
    id: string;
    tenantId: string | null;
    userId: string;
    user: User;
    type: NotificationType;
    title: string;
    body: string;
    refId: string | null;
    relatedType: string | null;
    relatedId: string | null;
    isRead: boolean;
    createdAt: Date;
}
