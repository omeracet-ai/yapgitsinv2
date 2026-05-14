import { CategorySubscriptionsService } from './category-subscriptions.service';
export declare class CategorySubscriptionsController {
    private readonly svc;
    constructor(svc: CategorySubscriptionsService);
    list(req: {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        category: string;
        city: string | null;
        alertEnabled: boolean;
        createdAt: Date;
    }[]>;
    create(req: {
        user: {
            id: string;
        };
    }, body: {
        category: string;
        city?: string;
    }): Promise<{
        id: string;
        category: string;
        city: string | null;
        alertEnabled: boolean;
        createdAt: Date;
    }>;
    remove(req: {
        user: {
            id: string;
        };
    }, id: string): Promise<{
        ok: true;
    }>;
}
