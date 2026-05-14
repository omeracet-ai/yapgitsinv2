import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
interface RequestWithTenant extends Request {
    tenant?: Tenant;
}
export declare class TenantsController {
    private readonly tenants;
    constructor(tenants: TenantsService);
    current(req: RequestWithTenant): Promise<{
        id: string;
        slug: string;
        brandName: string;
        theme: {
            primary?: string;
            accent?: string;
        } | null;
        defaultCurrency: string;
        defaultLocale: string;
    } | null>;
    list(): Promise<Tenant[]>;
    create(body: Partial<Tenant>): Promise<Tenant>;
    update(id: string, body: Partial<Tenant>): Promise<Tenant>;
}
export {};
