type UserId = string & { readonly __brand: 'UserId' };
type JobId = string & { readonly __brand: 'JobId' };
type OfferId = string & { readonly __brand: 'OfferId' };
type ServiceRequestId = string & { readonly __brand: 'ServiceRequestId' };

export const asUserId = (s: string): UserId => s as UserId;
export const asJobId = (s: string): JobId => s as JobId;
export const asOfferId = (s: string): OfferId => s as OfferId;
export const asServiceRequestId = (s: string): ServiceRequestId => s as ServiceRequestId;

export type { UserId, JobId, OfferId, ServiceRequestId };
