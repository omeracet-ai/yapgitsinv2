import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthUser } from '../../common/types/auth.types';
import { BotProtectionService } from './bot-protection.service';

/**
 * Phase 438 — admin endpoints for /admin/blocked-ips management.
 */
@ApiTags('admin')
@Controller('admin/blocked-ips')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class BotProtectionController {
  constructor(private bots: BotProtectionService) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const n = Math.min(500, Math.max(1, Number(limit) || 100));
    return this.bots.list(n);
  }

  @Post()
  async block(
    @Req() req: Request & { user: AuthUser },
    @Body()
    body: {
      ip: string;
      reason?: string;
      durationHours?: number | null;
      userAgent?: string;
    },
  ) {
    return this.bots.block(
      String(body.ip ?? '').trim(),
      String(body.reason ?? 'Admin block').trim(),
      req.user?.id ?? 'admin',
      body.durationHours ?? null,
      String(body.userAgent ?? ''),
    );
  }

  @Delete(':id')
  async unblock(@Param('id') id: string) {
    await this.bots.unblock(id);
    return { ok: true };
  }
}
