"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const blog_post_entity_1 = require("./blog-post.entity");
const tenant_aware_repository_1 = require("../../common/tenant-aware.repository");
let BlogService = class BlogService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async findAllPublished(page = 1, limit = 20, tag, tenantId) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.status = :status', { status: blog_post_entity_1.BlogPostStatus.PUBLISHED })
            .orderBy('p.publishedAt', 'DESC')
            .addOrderBy('p.createdAt', 'DESC')
            .skip((safePage - 1) * safeLimit)
            .take(safeLimit);
        (0, tenant_aware_repository_1.applyTenantFilter)(qb, 'p', tenantId);
        if (tag) {
            qb.andWhere('p.tags LIKE :tag', { tag: `%"${tag}"%` });
        }
        const [data, total] = await qb.getManyAndCount();
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.max(1, Math.ceil(total / safeLimit)),
        };
    }
    async findBySlug(slug, tenantId) {
        const qb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug });
        (0, tenant_aware_repository_1.applyTenantFilter)(qb, 'p', tenantId);
        const post = await qb.getOne();
        if (!post || post.status !== blog_post_entity_1.BlogPostStatus.PUBLISHED) {
            throw new common_1.NotFoundException('Yazı bulunamadı');
        }
        return post;
    }
    async adminFindAll(page = 1, limit = 50, tenantId) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
        const qb = this.repo
            .createQueryBuilder('p')
            .orderBy('p.createdAt', 'DESC')
            .skip((safePage - 1) * safeLimit)
            .take(safeLimit);
        (0, tenant_aware_repository_1.applyTenantFilter)(qb, 'p', tenantId);
        const [data, total] = await qb.getManyAndCount();
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.max(1, Math.ceil(total / safeLimit)),
        };
    }
    async adminFindOne(id, tenantId) {
        const qb = this.repo.createQueryBuilder('p').where('p.id = :id', { id });
        (0, tenant_aware_repository_1.applyTenantFilter)(qb, 'p', tenantId);
        const post = await qb.getOne();
        if (!post)
            throw new common_1.NotFoundException('Yazı bulunamadı');
        return post;
    }
    async adminCreate(dto, tenantId) {
        if (!dto.slug || !dto.title || !dto.content) {
            throw new common_1.ConflictException('slug, title ve content zorunlu');
        }
        const collideQb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug: dto.slug });
        if (tenantId) {
            collideQb.andWhere('(p.tenantId = :tid OR p.tenantId IS NULL)', { tid: tenantId });
        }
        const exists = await collideQb.getOne();
        if (exists)
            throw new common_1.ConflictException('Bu slug zaten kullanımda');
        const entity = this.repo.create({
            tenantId: tenantId ?? null,
            slug: dto.slug,
            title: dto.title,
            content: dto.content,
            excerpt: dto.excerpt ?? '',
            coverImageUrl: dto.coverImageUrl ?? null,
            category: dto.category ?? null,
            authorId: dto.authorId ?? null,
            tags: dto.tags ?? [],
            status: dto.status ?? blog_post_entity_1.BlogPostStatus.DRAFT,
            publishedAt: dto.publishedAt
                ? new Date(dto.publishedAt)
                : dto.status === blog_post_entity_1.BlogPostStatus.PUBLISHED
                    ? new Date()
                    : null,
            seoTitle: dto.seoTitle ?? null,
            seoDescription: dto.seoDescription ?? null,
        });
        return this.repo.save(entity);
    }
    async adminUpdate(id, dto, tenantId) {
        const post = await this.adminFindOne(id, tenantId);
        if (dto.slug && dto.slug !== post.slug) {
            const collideQb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug: dto.slug });
            if (tenantId) {
                collideQb.andWhere('(p.tenantId = :tid OR p.tenantId IS NULL)', { tid: tenantId });
            }
            const collide = await collideQb.getOne();
            if (collide && collide.id !== id)
                throw new common_1.ConflictException('Bu slug zaten kullanımda');
            post.slug = dto.slug;
        }
        if (dto.title !== undefined)
            post.title = dto.title;
        if (dto.content !== undefined)
            post.content = dto.content;
        if (dto.excerpt !== undefined)
            post.excerpt = dto.excerpt;
        if (dto.coverImageUrl !== undefined)
            post.coverImageUrl = dto.coverImageUrl;
        if (dto.authorId !== undefined)
            post.authorId = dto.authorId;
        if (dto.category !== undefined)
            post.category = dto.category;
        if (dto.tags !== undefined)
            post.tags = dto.tags;
        if (dto.seoTitle !== undefined)
            post.seoTitle = dto.seoTitle;
        if (dto.seoDescription !== undefined)
            post.seoDescription = dto.seoDescription;
        if (dto.status !== undefined) {
            post.status = dto.status;
            if (dto.status === blog_post_entity_1.BlogPostStatus.PUBLISHED && !post.publishedAt) {
                post.publishedAt = new Date();
            }
        }
        if (dto.publishedAt !== undefined) {
            post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
        }
        return this.repo.save(post);
    }
    async adminDelete(id, tenantId) {
        const post = await this.adminFindOne(id, tenantId);
        await this.repo.remove(post);
        return { ok: true };
    }
    async listSlugsForStatic(limit = 100, tenantId) {
        const qb = this.repo
            .createQueryBuilder('p')
            .where('p.status = :status', { status: blog_post_entity_1.BlogPostStatus.PUBLISHED })
            .orderBy('p.publishedAt', 'DESC')
            .take(limit)
            .select(['p.slug']);
        (0, tenant_aware_repository_1.applyTenantFilter)(qb, 'p', tenantId);
        const rows = await qb.getMany();
        return rows.map((r) => r.slug);
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(blog_post_entity_1.BlogPost)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BlogService);
//# sourceMappingURL=blog.service.js.map