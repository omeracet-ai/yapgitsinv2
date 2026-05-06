import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
export declare class CategoriesController {
    private readonly svc;
    constructor(svc: CategoriesService);
    findAll(): Promise<Category[]>;
    findOne(id: string): Promise<Category>;
    create(body: Partial<Category>): Promise<Category>;
    update(id: string, body: Partial<Category>): Promise<Category>;
    remove(id: string): Promise<void>;
}
