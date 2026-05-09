type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type JobId = Brand<string, 'JobId'>;
export type OfferId = Brand<string, 'OfferId'>;
export type ServiceRequestId = Brand<string, 'ServiceRequestId'>;
export type ServiceRequestApplicationId = Brand<string, 'ServiceRequestApplicationId'>;
export type BookingId = Brand<string, 'BookingId'>;
export type ReviewId = Brand<string, 'ReviewId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type EscrowId = Brand<string, 'EscrowId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type TokenTransactionId = Brand<string, 'TokenTransactionId'>;
export type ChatMessageId = Brand<string, 'ChatMessageId'>;
export type JobQuestionId = Brand<string, 'JobQuestionId'>;
export type BlogPostId = Brand<string, 'BlogPostId'>;

// Assertion functions (runtime no-op, compile-time guarantee)
export const asUserId = (s: string) => s as UserId;
export const asJobId = (s: string) => s as JobId;
export const asOfferId = (s: string) => s as OfferId;
export const asServiceRequestId = (s: string) => s as ServiceRequestId;
export const asServiceRequestApplicationId = (s: string) => s as ServiceRequestApplicationId;
export const asBookingId = (s: string) => s as BookingId;
export const asReviewId = (s: string) => s as ReviewId;
export const asCategoryId = (s: string) => s as CategoryId;
export const asEscrowId = (s: string) => s as EscrowId;
export const asNotificationId = (s: string) => s as NotificationId;
export const asTokenTransactionId = (s: string) => s as TokenTransactionId;
export const asChatMessageId = (s: string) => s as ChatMessageId;
export const asJobQuestionId = (s: string) => s as JobQuestionId;
export const asBlogPostId = (s: string) => s as BlogPostId;
