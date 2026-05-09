import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost, BlogPostStatus } from './blog-post.entity';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repo: Repository<BlogPost>,
  ) {}

  async findAllPublished(page = 1, limit = 20, tag?: string) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: BlogPostStatus.PUBLISHED })
      .orderBy('p.publishedAt', 'DESC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit);

    if (tag) {
      // simple-json column stored as TEXT; LIKE filter is good enough for tags
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

  async findBySlug(slug: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { slug } });
    if (!post || post.status !== BlogPostStatus.PUBLISHED) {
      throw new NotFoundException('Yazı bulunamadı');
    }
    return post;
  }

  async adminFindAll(page = 1, limit = 50) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async adminFindOne(id: string): Promise<BlogPost> {
    const post = await this.repo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Yazı bulunamadı');
    return post;
  }

  async adminCreate(dto: CreateBlogPostDto): Promise<BlogPost> {
    if (!dto.slug || !dto.title || !dto.content) {
      throw new ConflictException('slug, title ve content zorunlu');
    }
    const exists = await this.repo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Bu slug zaten kullanımda');
    const entity = this.repo.create({
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt ?? '',
      coverImageUrl: dto.coverImageUrl ?? null,
      authorId: dto.authorId ?? null,
      tags: dto.tags ?? [],
      status: dto.status ?? BlogPostStatus.DRAFT,
      publishedAt: dto.publishedAt
        ? new Date(dto.publishedAt)
        : dto.status === BlogPostStatus.PUBLISHED
          ? new Date()
          : null,
    });
    return this.repo.save(entity);
  }

  async adminUpdate(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.adminFindOne(id);
    if (dto.slug && dto.slug !== post.slug) {
      const collide = await this.repo.findOne({ where: { slug: dto.slug } });
      if (collide && collide.id !== id) throw new ConflictException('Bu slug zaten kullanımda');
      post.slug = dto.slug;
    }
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.excerpt !== undefined) post.excerpt = dto.excerpt;
    if (dto.coverImageUrl !== undefined) post.coverImageUrl = dto.coverImageUrl;
    if (dto.authorId !== undefined) post.authorId = dto.authorId;
    if (dto.tags !== undefined) post.tags = dto.tags;
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

  async adminDelete(id: string): Promise<{ ok: true }> {
    const post = await this.adminFindOne(id);
    await this.repo.remove(post);
    return { ok: true };
  }

  /** Used by web sitemap/static params */
  async listSlugsForStatic(limit = 100): Promise<string[]> {
    const rows = await this.repo.find({
      where: { status: BlogPostStatus.PUBLISHED },
      order: { publishedAt: 'DESC' },
      take: limit,
      select: { slug: true } as never,
    });
    return rows.map((r) => r.slug);
  }
}
