import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DataExportService } from './data-export.service';

/**
 * Phase 183 — KVKK / GDPR user data export.
 *
 * GET /users/me/data-export.json — returns a single JSON document with every
 * piece of data the platform stores about the authenticated user. Rate
 * limited to 3 / min per user to discourage scraping.
 */
@Controller('users/me')
@UseGuards(AuthGuard('jwt'))
export class DataExportController {
  constructor(private readonly svc: DataExportService) {}

  @Get('data-export.json')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Header('Content-Type', 'application/json; charset=utf-8')
  async export(@Req() req: any, @Res() res: Response): Promise<void> {
    const userId = req.user.id;
    const data = await this.svc.exportForUser(userId);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="yapgitsin-data-export-${userId}-${date}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }
}
