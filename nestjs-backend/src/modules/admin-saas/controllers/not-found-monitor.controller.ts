import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { NotFoundLog } from '../entities/not-found-log.entity';
import { Redirect } from '../entities/redirect.entity';

interface ReportBody {
  url: string;
  referrer?: string;
}

interface RedirectBody {
  src: string;
  dst: string;
  status?: 301 | 302;
}

/**
 * M2 — 404 Monitor + Redirect rules.
 * Public report endpoint (for marketing site middleware to POST 404 hits).
 * Admin endpoints under /admin/seo-404/* and /admin/redirects/*.
 */
@Controller()
export class NotFoundMonitorController {
  constructor(
    @InjectRepository(NotFoundLog)
    private readonly logs: Repository<NotFoundLog>,
    @InjectRepository(Redirect)
    private readonly redirects: Repository<Redirect>,
  ) {}

  /** Public — marketing site reports a 404. */
  @Post('seo/404')
  async report(@Body() body: ReportBody) {
    const url = (body?.url ?? '').trim().slice(0, 512);
    if (!url) throw new BadRequestException('url required');
    const existing = await this.logs.findOne({ where: { url } });
    if (existing) {
      existing.hitCount += 1;
      existing.lastSeenAt = new Date();
      if (body.referrer) existing.referrer = body.referrer.slice(0, 64);
      await this.logs.save(existing);
      return { ok: true, id: existing.id, hits: existing.hitCount };
    }
    const fresh = await this.logs.save(
      this.logs.create({
        url,
        hitCount: 1,
        referrer: body.referrer ? body.referrer.slice(0, 64) : null,
      }),
    );
    return { ok: true, id: fresh.id, hits: fresh.hitCount };
  }

  /** Public — lookup redirect for a URL. */
  @Get('seo/redirect-lookup')
  async lookup(@Query('url') url?: string) {
    if (!url) return { redirect: null };
    const r = await this.redirects.findOne({ where: { src: url, enabled: true } });
    if (!r) return { redirect: null };
    r.hits += 1;
    await this.redirects.save(r);
    return { redirect: { dst: r.dst, status: r.status } };
  }

  // ── Admin endpoints ────────────────────────────────────────────────────

  @Get('admin/seo-404')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @RequirePermission('seo-404', 'read')
  async list(@Query('limit') limit?: string) {
    const n = Math.min(500, Math.max(1, Number(limit ?? 100)));
    const items = await this.logs.find({
      order: { hitCount: 'DESC', lastSeenAt: 'DESC' },
      take: n,
    });
    const total = await this.logs.count();
    const last24h = await this.logs
      .createQueryBuilder('l')
      .where("l.lastSeenAt > datetime('now', '-1 day')")
      .getCount();
    return { items, total, last24h };
  }

  @Delete('admin/seo-404/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @RequirePermission('seo-404', 'delete')
  async deleteLog(@Param('id') id: string) {
    await this.logs.delete({ id });
    return { ok: true };
  }

  @Get('admin/redirects')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @RequirePermission('seo-404', 'read')
  async listRedirects() {
    const items = await this.redirects.find({
      order: { createdAt: 'DESC' },
    });
    return { items, total: items.length };
  }

  @Post('admin/redirects')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @RequirePermission('seo-404', 'write')
  async createRedirect(@Body() body: RedirectBody) {
    const src = (body?.src ?? '').trim().slice(0, 512);
    const dst = (body?.dst ?? '').trim().slice(0, 512);
    const status = body?.status === 302 ? 302 : 301;
    if (!src || !dst) throw new BadRequestException('src + dst required');
    if (src === dst) throw new BadRequestException('src ve dst aynı olamaz');
    const existing = await this.redirects.findOne({ where: { src } });
    if (existing) {
      existing.dst = dst;
      existing.status = status;
      existing.enabled = true;
      return this.redirects.save(existing);
    }
    return this.redirects.save(this.redirects.create({ src, dst, status }));
  }

  @Delete('admin/redirects/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @RequirePermission('seo-404', 'delete')
  async deleteRedirect(@Param('id') id: string) {
    await this.redirects.delete({ id });
    return { ok: true };
  }
}
