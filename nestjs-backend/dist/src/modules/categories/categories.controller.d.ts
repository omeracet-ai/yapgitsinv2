import type { Cache } from 'cache-manager';
import { CategoriesService } from './categories.service';
import { CategorySearchService } from './category-search.service';
import { Category } from './category.entity';
export declare class CategoriesController {
    private readonly svc;
    private readonly searchSvc;
    private readonly cache;
    constructor(svc: CategoriesService, searchSvc: CategorySearchService, cache: Cache);
    findAll(): Promise<Category[]>;
    search(q: string, limit?: string): Category[];
    findOne(id: string): Promise<Category>;
    create(body: Partial<Category>): Promise<Category>;
    update(id: string, body: Partial<Category>): Promise<Category>;
    remove(id: string): Promise<void>;
    private invalidateListCache;
}
