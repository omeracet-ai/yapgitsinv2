import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantsService } from '../modules/tenants/tenants.service';
import { Tenant } from '../modules/tenants/tenant.entity';
declare module 'express-serve-static-core' {
    interface Request {
        tenant?: Tenant;
    }
}
export declare class TenantMiddleware implements NestMiddleware {
    private readonly tenants;
    constructor(tenants: TenantsService);
    use(req: Request, _res: Response, next: NextFunction): Promise<void>;
}
