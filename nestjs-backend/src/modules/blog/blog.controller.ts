import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { BlogService } from './blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog-post.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import type { AuthUser } from '../../common/types/auth.types';

@Controller('blog')
export class BlogPublicController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tag') tag?: string,
  ) {
    return this.blog.findAllPublished(Number(page) || 1, Number(limit) || 20, tag);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.blog.findBySlug(slug);
  }
}

@Controller('admin/blog')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class BlogAdminController {
  constructor(
    private readonly blog: BlogService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blog.adminFindAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.blog.adminFindOne(id);
  }

  @Post()
  async create(@Body() dto: CreateBlogPostDto, @Req() req: Request & { user: AuthUser }) {
    const post = await this.blog.adminCreate(dto);
    await this.audit.logAction(req.user.id, 'blog.create', 'blog_post', post.id, {
      slug: post.slug,
      title: post.title,
      status: post.status,
    });
    return post;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    const post = await this.blog.adminUpdate(id, dto);
    await this.audit.logAction(req.user.id, 'blog.update', 'blog_post', id, dto as unknown as Record<string, unknown>);
    return post;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    const result = await this.blog.adminDelete(id);
    await this.audit.logAction(req.user.id, 'blog.delete', 'blog_post', id);
    return result;
  }
}
