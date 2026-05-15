import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Audit } from '../admin-audit/audit.decorator';
import { AuditInterceptor } from '../admin-audit/audit.interceptor';
import { MaintenanceService } from './maintenance.service';

@SkipThrottle({ short: true, medium: true, long: true, default: true })
@Controller('admin/maintenance')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@UseInterceptors(AuditInterceptor)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  /**
   * POST /admin/maintenance/backfill-coords
   * Body: { apply?: boolean }  (default false → dry-run)
   *
   * Plesk Scheduled Tasks paketinde olmadığı için backfill scriptini bu
   * endpoint üstünden curl ile tetikliyoruz. Aynı mantık scripts/backfill-coords.js.
   */
  @Audit('maintenance.backfill_coords')
  @Post('backfill-coords')
  async backfillCoords(@Body() body: { apply?: boolean } | undefined) {
    const apply = !!body?.apply;
    return this.maintenance.backfillCoordinates(apply);
  }
}
