import { SubscriptionsService } from './subscriptions.service';
export declare class SubscriptionsController {
    private readonly subsService;
    constructor(subsService: SubscriptionsService);
    listPlans(): Promise<{
        key: string;
        name: string;
        price: number;
        period: import("./subscription-plan.entity").SubscriptionPeriod;
        features: string[];
    }[]>;
    getMy(req: {
        user: {
            id: string;
        };
    }): Promise<{
        plan: {
            key: string;
            name: string;
            price: number;
            period: import("./subscription-plan.entity").SubscriptionPeriod;
            features: string[];
        };
        status: import("./user-subscription.entity").SubscriptionStatus;
        startedAt: Date;
        expiresAt: Date;
        cancelledAt: Date | null;
    } | null>;
    subscribe(req: {
        user: {
            id: string;
        };
    }, body: {
        planKey?: string;
    }): Promise<{
        subscriptionId: string;
        paymentUrl: string;
        paymentToken: string;
        mock: boolean;
    }>;
    confirm(req: {
        user: {
            id: string;
        };
    }, body: {
        token?: string;
    }): Promise<{
        subscriptionId: string;
        status: import("./user-subscription.entity").SubscriptionStatus;
        expiresAt: Date;
    }>;
    cancel(req: {
        user: {
            id: string;
        };
    }): Promise<{
        status: import("./user-subscription.entity").SubscriptionStatus;
        expiresAt: Date;
    }>;
}
