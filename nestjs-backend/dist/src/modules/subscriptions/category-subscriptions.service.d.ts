import { Repository } from 'typeorm';
import { CategorySubscription } from './category-subscription.entity';
export declare class CategorySubscriptionsService {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<CategorySubscription>);
    listMine(userId: string): Promise<CategorySubscription[]>;
    create(userId: string, category: string, city?: string | null): Promise<CategorySubscription>;
    remove(id: string, userId: string): Promise<{
        ok: true;
    }>;
    findMatches(category: string, location?: string | null): Promise<CategorySubscription[]>;
    markNotified(id: string): Promise<void>;
}
