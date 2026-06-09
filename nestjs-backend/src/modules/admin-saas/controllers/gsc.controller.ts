import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GscService } from '../services/gsc.service';

/**
 * M3 — GSC Dashboard (mock-first; live OAuth behind GSC_OAUTH_ENABLED).
 */
@Controller('admin/seo-gsc')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@RequirePermission('seo-gsc')
export class GscController {
  constructor(private readonly svc: GscService) {}

  @Get()
  report(@Query('days') days?: string) {
    const n = Math.min(90, Math.max(7, Number(days ?? 30)));
    return this.svc.report(n);
  }

  @Get('quick-wins')
  quickWins() {
    return this.svc.quickWins();
  }
}
