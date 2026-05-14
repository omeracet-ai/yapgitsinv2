export declare enum BoostType {
    FEATURED_24H = "featured_24h",
    FEATURED_7D = "featured_7d",
    TOP_SEARCH_24H = "top_search_24h"
}
export declare enum BoostStatus {
    ACTIVE = "active",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}
export declare class Boost {
    id: string;
    userId: string;
    type: BoostType;
    tokenCost: number;
    startsAt: Date;
    expiresAt: Date;
    status: BoostStatus;
    createdAt: Date;
}
export declare const BOOST_PACKAGES: Array<{
    type: BoostType;
    tokenCost: number;
    durationHours: number;
    name: string;
    description: string;
}>;
