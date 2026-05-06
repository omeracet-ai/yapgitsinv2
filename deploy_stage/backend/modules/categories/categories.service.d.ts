import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
export declare class CategoriesService implements OnModuleInit {
    private repo;
    constructor(repo: Repository<Category>);
    onModuleInit(): Promise<void>;
    findAll(): Promise<Category[]>;
    findOne(id: string): Promise<Category>;
    create(data: Partial<Category>): Promise<Category>;
    update(id: string, data: Partial<Category>): Promise<Category>;
    remove(id: string): Promise<void>;
}
