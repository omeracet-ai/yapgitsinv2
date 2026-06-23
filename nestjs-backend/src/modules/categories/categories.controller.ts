import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  Inject,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import {
  CACHE_MANAGER,
  CacheInterceptor,
  CacheKey,
  CacheTTL,
} from '@nestjs/cache-manager';
import { SkipThrottle } from '@nestjs/throttler';
import type { Cache } from 'cache-manager';
import { CategoriesService } from './categories.service';
import { CategorySearchService } from './category-search.service';
import { Category } from './category.entity';

/** Phase 170 — kategoriler nadiren değişir → uzun TTL (ms). */
const CATEGORIES_LIST_TTL = 5 * 60 * 1000; // 5 dk
const CATEGORIES_LIST_KEY = 'categories:list';
/** Arama sonuçları — kısa TTL (popüler aramaları cache'le). */
const CATEGORY_SEARCH_TTL = 60 * 1000; // 1 dk

@Controller('categories')
@UseInterceptors(CacheInterceptor)
export class CategoriesController {
  constructor(
    private readonly svc: CategoriesService,
    private readonly searchSvc: CategorySearchService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @SkipThrottle()
  @Get()
  @CacheKey(CATEGORIES_LIST_KEY)
  @CacheTTL(CATEGORIES_LIST_TTL)
  findAll() {
    return this.svc.findAll();
  }

  /**
   * Phase 522b — Cache bypass diagnostic.
   * `GET /categories/raw` doğrudan DB'den okur, cache'siz.
   * Prod canlısında upsert'in çalışıp çalışmadığını anlamak için.
   */
  @SkipThrottle()
  @Get('raw')
  async findAllRaw() {
    const all = await this.svc.findAllIncludingInactive();
    const active = all.filter((c) => c.isActive);
    const groups: Record<string, string[]> = {};
    for (const c of active) {
      const g = c.group || 'NULL';
      (groups[g] ||= []).push(c.name);
    }
    return {
      total: all.length,
      active: active.length,
      groups,
      items: all.map((c) => ({
        name: c.name,
        group: c.group,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      })),
    };
  }

  /**
   * Phase 176 — Trie + Levenshtein fuzzy autocomplete.
   * Örn: /categories/search?q=boyaci → "Boya & Badana"
   * Phase 170 — sonuçlar q+limit bazında 1 dk cache'lenir (CacheInterceptor default key = url).
   */
  @SkipThrottle()
  @Get('search')
  @CacheTTL(CATEGORY_SEARCH_TTL)
  search(@Query('q') q: string, @Query('limit') limit?: string): Category[] {
    const lim = Math.min(
      Math.max(Number.parseInt(limit ?? '5', 10) || 5, 1),
      20,
    );
    return this.searchSvc.searchCategories(q ?? '', lim);
  }

  /**
   * Phase 238B — Kategori ağacı (group bazlı hiyerarşi).
   * NOT: Bu route MUTLAKA @Get(':id')'den ÖNCE tanımlı olmalı,
   * aksi halde Nest 'tree' kelimesini id parametresi olarak yorumlar.
   */
  @SkipThrottle()
  @Get('tree')
  @CacheTTL(CATEGORIES_LIST_TTL)
  tree() {
    return this.svc.findTree();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post()
  async create(@Body() body: Partial<Category>) {
    const cat = await this.svc.create(body);
    await this.searchSvc.rebuild();
    await this.invalidateListCache();
    return cat;
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Category>) {
    const cat = await this.svc.update(id, body);
    await this.searchSvc.rebuild();
    await this.invalidateListCache();
    return cat;
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    await this.searchSvc.rebuild();
    await this.invalidateListCache();
  }

  /** Kategori yazma operasyonlarından sonra liste cache'ini düşür. */
  private async invalidateListCache(): Promise<void> {
    try {
      await this.cache.del(CATEGORIES_LIST_KEY);
    } catch {
      /* cache erişilemezse sessiz geç — veri yine doğru döner */
    }
  }
}
