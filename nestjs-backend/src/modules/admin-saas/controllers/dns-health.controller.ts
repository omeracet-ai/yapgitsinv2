import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { DnsHealthService } from '../services/dns-health.service';

const DEFAULT_DOMAIN = 'yapgitsin.tr';

/**
 * M7 — DNS Health for email deliverability.
 */
@Controller('admin/dns-health')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class DnsHealthController {
  constructor(private readonly svc: DnsHealthService) {}

  @Get()
  check(@Query('domain') domain?: string) {
    const clean = (domain ?? DEFAULT_DOMAIN).trim().toLowerCase();
    const safe = clean.replace(/[^a-z0-9.-]/g, '');
    return this.svc.check(safe || DEFAULT_DOMAIN);
  }
}
