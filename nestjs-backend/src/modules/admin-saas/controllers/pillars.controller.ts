import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { PillarPage } from '../entities/pillar-page.entity';
import { GeminiClient } from '../../ai/gemini.client';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

interface PillarUpsert {
  slug?: string;
  title: string;
  topic: string;
  content?: string;
  seoMetaTitle?: string;
  seoMetaDesc?: string;
}

/**
 * M5 — SEO Pillar pages + cluster generation.
 */
@Controller('admin/seo-pillars')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class PillarsController {
  constructor(
    @InjectRepository(PillarPage)
    private readonly pillars: Repository<PillarPage>,
    private readonly gemini: GeminiClient,
  ) {}

  @Get()
  async list() {
    const items = await this.pillars.find({ order: { updatedAt: 'DESC' } });
    return { items, total: items.length };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.pillars.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() body: PillarUpsert) {
    if (!body?.title || !body?.topic) {
      throw new BadRequestException('title + topic required');
    }
    const slug = body.slug ? slugify(body.slug) : slugify(body.title);
    const exists = await this.pillars.findOne({ where: { slug } });
    if (exists) throw new BadRequestException('slug already exists');
    return this.pillars.save(
      this.pillars.create({
        slug,
        title: body.title,
        topic: body.topic,
        content: body.content ?? null,
        seoMetaTitle: body.seoMetaTitle ?? null,
        seoMetaDesc: body.seoMetaDesc ?? null,
      }),
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<PillarUpsert>) {
    const p = await this.pillars.findOne({ where: { id } });
    if (!p) throw new BadRequestException('pillar not found');
    if (body.title) p.title = body.title;
    if (body.topic) p.topic = body.topic;
    if (typeof body.content === 'string') p.content = body.content;
    if (typeof body.seoMetaTitle === 'string') p.seoMetaTitle = body.seoMetaTitle;
    if (typeof body.seoMetaDesc === 'string') p.seoMetaDesc = body.seoMetaDesc;
    return this.pillars.save(p);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.pillars.delete({ id });
    return { ok: true };
  }

  /**
   * Background pillar content generation via Gemini.
   * Returns immediately; status pollable via GET /:id (generationStatus field).
   */
  @Post(':id/generate')
  async generate(@Param('id') id: string) {
    const p = await this.pillars.findOne({ where: { id } });
    if (!p) throw new BadRequestException('pillar not found');
    if (!this.gemini.isAvailable()) {
      throw new BadRequestException('AI servisi yapılandırılmamış');
    }
    p.generationStatus = 'running';
    p.generationError = null;
    await this.pillars.save(p);

    // Background generation (fire and forget — status pollable via GET)
    setImmediate(() => {
      void (async () => {
        try {
          const markdown = await this.gemini.generate({
            systemText:
              'Sen Yapgitsin SEO içerik mühendisisin. Türkçe, Markdown, 1500-2000 kelime, H2/H3 hiyerarşi. Pillar+cluster mimarisinde pillar sayfa: konuyu derinlemesine + 8-10 alt başlık + iç bağlantı önerileri. "Hizmet veren" kullan, "usta" yasak.',
            userText: `Pillar konusu: "${p.topic}". Başlık: "${p.title}". Yapgitsin'in ${p.topic} kategorisi için kapsamlı pillar sayfası içeriği üret. SEO meta title (60 char) ve meta description (160 char) ile bitir.`,
            maxOutputTokens: 4000,
            temperature: 0.5,
          });
          const fresh = await this.pillars.findOne({ where: { id } });
          if (!fresh) return;
          fresh.content = markdown;
          fresh.generationStatus = 'done';
          await this.pillars.save(fresh);
        } catch (err) {
          const fresh = await this.pillars.findOne({ where: { id } });
          if (!fresh) return;
          fresh.generationStatus = 'failed';
          fresh.generationError =
            err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
          await this.pillars.save(fresh);
        }
      })();
    });

    return { ok: true, status: 'running' };
  }

  @Get(':id/status')
  async status(@Param('id') id: string) {
    const p = await this.pillars.findOne({
      where: { id },
      select: ['id', 'generationStatus', 'generationError'],
    });
    if (!p) throw new BadRequestException('pillar not found');
    return p;
  }
}
