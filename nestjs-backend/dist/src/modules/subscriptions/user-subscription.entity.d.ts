import { User } from '../users/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
export declare enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    PENDING_PAYMENT = "pending_payment"
}
export declare class UserSubscription {
    id: string;
    userId: string;
    user: User;
    planId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startedAt: Date;
    expiresAt: Date;
    cancelledAt: Date | null;
    paymentRef: string | null;
    createdAt: Date;
}
