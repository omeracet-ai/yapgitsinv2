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

  /**
   * POST /admin/maintenance/seed-demo-workers
   * Body: { count?: number = 5, dryRun?: boolean = false }
   *
   * Promotes N existing coordinate-backed customer rows to "worker" by setting
   * workerCategories + isAvailable + homeGeohash + serviceRadiusKm so the
   * /users/workers/nearby endpoint produces map pins.
   */
  /**
   * POST /admin/maintenance/ensure-indexes
   * Idempotent — creates 8 hot-path indexes on jobs/users (IF NOT EXISTS).
   * Run after deploy or whenever query latency regresses on those tables.
   */
  @Audit('maintenance.ensure_indexes')
  @Post('ensure-indexes')
  async ensureIndexes() {
    return this.maintenance.ensureIndexes();
  }

  @Audit('maintenance.seed_demo_workers')
  @Post('seed-demo-workers')
  async seedDemoWorkers(
    @Body() body: { count?: number; dryRun?: boolean } | undefined,
  ) {
    return this.maintenance.seedDemoWorkers({
      count: body?.count ?? 5,
      dryRun: body?.dryRun ?? false,
    });
  }

  /**
   * POST /admin/maintenance/seed-demo-jobs
   * Body: { count?: number = 15, dryRun?: boolean = false }
   *
   * Creates N realistic demo jobs (status=open) owned by coordinate-backed
   * users so the public listing page looks populated pre-launch.
   */
  @Audit('maintenance.seed_demo_jobs')
  @Post('seed-demo-jobs')
  async seedDemoJobs(
    @Body() body: { count?: number; dryRun?: boolean } | undefined,
  ) {
    return this.maintenance.seedDemoJobs({
      count: body?.count ?? 15,
      dryRun: body?.dryRun ?? false,
    });
  }
}
