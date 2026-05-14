import type { Request } from 'express';
import { BlogService } from './blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import type { AuthUser } from '../../common/types/auth.types';
import type { Tenant } from '../tenants/tenant.entity';
interface RequestWithTenant extends Request {
    tenant?: Tenant;
}
export declare class BlogPublicController {
    private readonly blog;
    constructor(blog: BlogService);
    list(req: RequestWithTenant, page?: string, limit?: string, tag?: string): Promise<{
        data: import("./blog-post.entity").BlogPost[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    detail(slug: string, req: RequestWithTenant): Promise<import("./blog-post.entity").BlogPost>;
}
export declare class BlogAdminController {
    private readonly blog;
    private readonly audit;
    constructor(blog: BlogService, audit: AdminAuditService);
    list(req: RequestWithTenant, page?: string, limit?: string): Promise<{
        data: import("./blog-post.entity").BlogPost[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    one(id: string, req: RequestWithTenant): Promise<import("./blog-post.entity").BlogPost>;
    create(dto: CreateBlogPostDto, req: RequestWithTenant & {
        user: AuthUser;
    }): Promise<import("./blog-post.entity").BlogPost>;
    update(id: string, dto: UpdateBlogPostDto, req: RequestWithTenant & {
        user: AuthUser;
    }): Promise<import("./blog-post.entity").BlogPost>;
    remove(id: string, req: RequestWithTenant & {
        user: AuthUser;
    }): Promise<{
        ok: true;
    }>;
}
export {};
