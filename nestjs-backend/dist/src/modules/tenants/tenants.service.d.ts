import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
export declare const DEFAULT_TENANT_SLUG = "tr";
export declare class TenantsService implements OnModuleInit {
    private readonly tenantRepo;
    constructor(tenantRepo: Repository<Tenant>);
    onModuleInit(): Promise<void>;
    findBySlug(slug: string): Promise<Tenant | null>;
    findBySubdomain(subdomain: string): Promise<Tenant | null>;
    findById(id: string): Promise<Tenant>;
    list(): Promise<Tenant[]>;
    create(data: Partial<Tenant>): Promise<Tenant>;
    update(id: string, data: Partial<Tenant>): Promise<Tenant>;
    getDefault(): Promise<Tenant | null>;
}
