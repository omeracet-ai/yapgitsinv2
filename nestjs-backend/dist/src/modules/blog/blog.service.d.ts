import { Repository } from 'typeorm';
import { BlogPost } from './blog-post.entity';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';
export declare class BlogService {
    private readonly repo;
    constructor(repo: Repository<BlogPost>);
    findAllPublished(page?: number, limit?: number, tag?: string, tenantId?: string | null): Promise<{
        data: BlogPost[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    findBySlug(slug: string, tenantId?: string | null): Promise<BlogPost>;
    adminFindAll(page?: number, limit?: number, tenantId?: string | null): Promise<{
        data: BlogPost[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    adminFindOne(id: string, tenantId?: string | null): Promise<BlogPost>;
    adminCreate(dto: CreateBlogPostDto, tenantId?: string | null): Promise<BlogPost>;
    adminUpdate(id: string, dto: UpdateBlogPostDto, tenantId?: string | null): Promise<BlogPost>;
    adminDelete(id: string, tenantId?: string | null): Promise<{
        ok: true;
    }>;
    listSlugsForStatic(limit?: number, tenantId?: string | null): Promise<string[]>;
}
