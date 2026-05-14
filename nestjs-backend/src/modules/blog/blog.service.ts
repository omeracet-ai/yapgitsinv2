import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost, BlogPostStatus } from './blog-post.entity';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';
import { applyTenantFilter } from '../../common/tenant-aware.repository';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repo: Repository<BlogPost>,
  ) {}

  async findAllPublished(page = 1, limit = 20, tag?: string, tenantId?: string | null) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: BlogPostStatus.PUBLISHED })
      .orderBy('p.publishedAt', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    applyTenantFilter(qb, 'p', tenantId);

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

  async findBySlug(slug: string, tenantId?: string | null): Promise<BlogPost> {
    const qb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug });
    applyTenantFilter(qb, 'p', tenantId);
    const post = await qb.getOne();
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException('Yazı bulunamadı');
    }
    return post;
  }

  async adminFindAll(page = 1, limit = 50, tenantId?: string | null) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);
    applyTenantFilter(qb, 'p', tenantId);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async adminFindOne(id: string, tenantId?: string | null): Promise<BlogPost> {
    const qb = this.repo.createQueryBuilder('p').where('p.id = :id', { id });
    applyTenantFilter(qb, 'p', tenantId);
    const post = await qb.getOne();
    if (!post) throw new NotFoundException('Yazı bulunamadı');
    return post;
  }

  async adminCreate(dto: CreateBlogPostDto, tenantId?: string | null): Promise<BlogPost> {
    if (!dto.slug || !dto.title || !dto.content) {
      throw new ConflictException('slug, title ve content zorunlu');
    }
    // Slug uniqueness scoped to tenant
    const collideQb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug: dto.slug });
    if (tenantId) {
      collideQb.andWhere('(p.tenantId = :tid OR p.tenantId IS NULL)', { tid: tenantId });
    }
    const exists = await collideQb.getOne();
    if (exists) throw new ConflictException('Bu slug zaten kullanımda');
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
      status: dto.status ?? BlogPostStatus.DRAFT,
      publishedAt: dto.publishedAt
        ? new Date(dto.publishedAt)
        : dto.status === BlogPostStatus.PUBLISHED
          ? new Date()
          : null,
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
    });
    return this.repo.save(entity);
  }

  async adminUpdate(id: string, dto: UpdateBlogPostDto, tenantId?: string | null): Promise<BlogPost> {
    const post = await this.adminFindOne(id, tenantId);
    if (dto.slug && dto.slug !== post.slug) {
      const collideQb = this.repo.createQueryBuilder('p').where('p.slug = :slug', { slug: dto.slug });
      if (tenantId) {
        collideQb.andWhere('(p.tenantId = :tid OR p.tenantId IS NULL)', { tid: tenantId });
      }
      const collide = await collideQb.getOne();
      if (collide && collide.id !== id) throw new ConflictException('Bu slug zaten kullanımda');
      post.slug = dto.slug;
    }
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.excerpt !== undefined) post.excerpt = dto.excerpt;
    if (dto.coverImageUrl !== undefined) post.coverImageUrl = dto.coverImageUrl;
    if (dto.authorId !== undefined) post.authorId = dto.authorId;
    if (dto.category !== undefined) post.category = dto.category;
    if (dto.tags !== undefined) post.tags = dto.tags;
    if (dto.seoTitle !== undefined) post.seoTitle = dto.seoTitle;
    if (dto.seoDescription !== undefined) post.seoDescription = dto.seoDescription;
    if (dto.status !== undefined) {
      post.status = dto.status;
      if (dto.status === BlogPostStatus.PUBLISHED && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }
    if (dto.publishedAt !== undefined) {
      post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }
    return this.repo.save(post);
  }

  async adminDelete(id: string, tenantId?: string | null): Promise<{ ok: true }> {
    const post = await this.adminFindOne(id, tenantId);
    await this.repo.remove(post);
    return { ok: true };
  }

  /** Used by web sitemap/static params */
  async listSlugsForStatic(limit = 100, tenantId?: string | null): Promise<string[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: BlogPostStatus.PUBLISHED })
      .orderBy('p.publishedAt', 'DESC')
      .take(limit)
      .select(['p.slug']);
    applyTenantFilter(qb, 'p', tenantId);
    const rows = await qb.getMany();
    return rows.map((r) => r.slug);
  }
}
