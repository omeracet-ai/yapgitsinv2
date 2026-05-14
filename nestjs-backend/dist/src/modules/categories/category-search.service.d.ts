import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
export declare function normalizeTr(input: string): string;
export declare function levenshtein(a: string, b: string): number;
export declare class CategorySearchService implements OnModuleInit {
    private readonly repo;
    private readonly logger;
    private root;
    private tokenIndex;
    private categoryById;
    constructor(repo: Repository<Category>);
    onModuleInit(): Promise<void>;
    rebuild(): Promise<void>;
    private insertTrie;
    private countNodes;
    searchCategories(query: string, limit?: number): Category[];
    private prefixMatch;
}
