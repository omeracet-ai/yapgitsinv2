import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantsService } from '../modules/tenants/tenants.service';
import { Tenant } from '../modules/tenants/tenant.entity';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: Tenant;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantsService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    let tenant: Tenant | null = null;

    // 1. X-Tenant-Slug header (en yüksek öncelik — dev/test)
    const headerSlug = (req.headers['x-tenant-slug'] as string | undefined)?.trim();
    if (headerSlug) {
      tenant = await this.tenants.findBySlug(headerSlug);
    }

    // 2. Host header → subdomain parse
    if (!tenant) {
      const host = (req.headers['host'] || '').toString().split(':')[0].toLowerCase();
      if (host) {
        // try exact subdomain/customDomain match
        tenant = await this.tenants.findBySubdomain(host);
        if (!tenant) {
          const parts = host.split('.');
          if (parts.length >= 2) {
            const sub = parts[0];
            if (sub && sub !== 'www' && sub !== 'localhost') {
              tenant = await this.tenants.findBySlug(sub);
            }
          }
        }
      }
    }

    // 3. Default tenant fallback
    if (!tenant) {
      tenant = await this.tenants.getDefault();
    }

    if (tenant) {
      req.tenant = tenant;
    }
    next();
  }
}
