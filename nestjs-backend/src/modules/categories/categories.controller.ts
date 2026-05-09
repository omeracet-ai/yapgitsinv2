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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategorySearchService } from './category-search.service';
import { Category } from './category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly svc: CategoriesService,
    private readonly searchSvc: CategorySearchService,
  ) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  /**
   * Phase 176 — Trie + Levenshtein fuzzy autocomplete.
   * Örn: /categories/search?q=boyaci → "Boya & Badana"
   */
  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit?: string): Category[] {
    const lim = Math.min(Math.max(Number.parseInt(limit ?? '5', 10) || 5, 1), 20);
    return this.searchSvc.searchCategories(q ?? '', lim);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@Body() body: Partial<Category>) {
    const cat = await this.svc.create(body);
    await this.searchSvc.rebuild();
    return cat;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Category>) {
    const cat = await this.svc.update(id, body);
    await this.searchSvc.rebuild();
    return cat;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    await this.searchSvc.rebuild();
  }
}
