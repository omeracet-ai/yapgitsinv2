export declare enum BroadcastSegment {
    ALL = "all",
    WORKERS = "workers",
    CUSTOMERS = "customers",
    VERIFIED_WORKERS = "verified_workers"
}
export declare class BroadcastNotificationDto {
    title: string;
    message: string;
    segment: BroadcastSegment;
}
