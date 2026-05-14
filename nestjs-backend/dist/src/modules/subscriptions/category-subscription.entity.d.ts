export declare class CategorySubscription {
    id: string;
    tenantId: string | null;
    userId: string;
    category: string;
    city: string | null;
    alertEnabled: boolean;
    lastNotifiedAt: Date | null;
    createdAt: Date;
}
