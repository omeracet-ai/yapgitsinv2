export declare enum SubscriptionPeriod {
    MONTHLY = "monthly",
    YEARLY = "yearly"
}
export declare class SubscriptionPlan {
    id: string;
    key: string;
    name: string;
    price: number;
    period: SubscriptionPeriod;
    features: string[];
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
}
