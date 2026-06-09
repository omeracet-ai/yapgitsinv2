import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { QualityCheckService, QualityCheckResult } from '../services/quality-check.service';

/**
 * M6 — Quality Check (read-only data hygiene scanner).
 */
@Controller('admin/quality-check')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class QualityCheckController {
  constructor(private readonly svc: QualityCheckService) {}

  @Get()
  async run(): Promise<QualityCheckResult> {
    return this.svc.run();
  }
}
