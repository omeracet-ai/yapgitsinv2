import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GscService } from '../services/gsc.service';
import { GeminiClient } from '../../ai/gemini.client';
import { BlogDraft } from '../entities/blog-draft.entity';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * M4 — Keyword Finder. GSC opportunity → Gemini blog draft.
 */
@Controller('admin/seo-keywords')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@RequirePermission('seo-keywords')
export class KeywordFinderController {
  constructor(
    private readonly gsc: GscService,
    private readonly gemini: GeminiClient,
    @InjectRepository(BlogDraft)
    private readonly drafts: Repository<BlogDraft>,
  ) {}

  @Get('opportunities')
  async opportunities() {
    const wins = await this.gsc.quickWins();
    return { items: wins, total: wins.length };
  }

  @Get('drafts')
  async listDrafts() {
    const items = await this.drafts.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { items, total: items.length };
  }

  @Get('drafts/:id')
  draft(@Param('id') id: string) {
    return this.drafts.findOne({ where: { id } });
  }

  @Post('drafts')
  async createDraft(
    @Body() body: { query: string; gscPosition?: number; gscImpressions?: number },
  ) {
    const q = (body?.query ?? '').trim();
    if (!q) throw new BadRequestException('query required');
    const slug = slugify(q) || `taslak-${Date.now()}`;
    let markdown = '';
    if (this.gemini.isAvailable()) {
      try {
        markdown = await this.gemini.generate({
          systemText:
            'Sen Yapgitsin için Türkçe blog yazarısın. SEO odaklı, 600-800 kelime, Markdown format. H2 alt başlıklar, kısa paragraflar, lokal Türkiye örnekleri. Asla "müşterilerimize" yazma — okuyucu hizmet alıcı veya hizmet veren. "Usta" kelimesi yerine "hizmet veren" kullan.',
          userText: `Arama sorgusu: "${q}". Bu sorguyu hedefleyen, Yapgitsin marketplace'i için kullanıcıya değer veren bir blog post taslağı yaz. Başlıkla başla, ardından giriş + 4-6 H2 başlık + sonuç bölümü.`,
          maxOutputTokens: 1600,
          temperature: 0.6,
        });
      } catch (err) {
        markdown = `# ${q}\n\n*(AI taslak üretilemedi: ${err instanceof Error ? err.message : 'hata'})*\n`;
      }
    } else {
      markdown = `# ${q}\n\n*(GEMINI_API_KEY tanımlı değil — manuel yaz)*\n`;
    }

    // Ensure unique slug
    let finalSlug = slug;
    const existing = await this.drafts.findOne({ where: { slug } });
    if (existing) finalSlug = `${slug}-${Date.now().toString(36)}`;

    return this.drafts.save(
      this.drafts.create({
        query: q,
        slug: finalSlug,
        markdown,
        gscPosition: body.gscPosition ?? null,
        gscImpressions: body.gscImpressions ?? null,
        status: 'draft',
      }),
    );
  }
}
