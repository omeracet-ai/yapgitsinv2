type UserId = string & {
    readonly __brand: 'UserId';
};
type JobId = string & {
    readonly __brand: 'JobId';
};
type OfferId = string & {
    readonly __brand: 'OfferId';
};
type ServiceRequestId = string & {
    readonly __brand: 'ServiceRequestId';
};
export declare const asUserId: (s: string) => UserId;
export declare const asJobId: (s: string) => JobId;
export declare const asOfferId: (s: string) => OfferId;
export declare const asServiceRequestId: (s: string) => ServiceRequestId;
export type { UserId, JobId, OfferId, ServiceRequestId };
