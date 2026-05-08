import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import type { AuthUser } from '../../common/types/auth.types';
import type { LeadSource, LeadStatus } from './lead-request.entity';

@Controller()
export class LeadsController {
  constructor(
    private readonly svc: LeadsService,
    private readonly audit: AdminAuditService,
  ) {}

  // ---- Public (no auth) lead capture ----
  // Strict per-IP rate limit: 5 req / minute on top of global 60/min.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('leads')
  async create(@Body() dto: CreateLeadDto, @Req() req: Request) {
    const ipRaw =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      null;
    const ua = (req.headers['user-agent'] as string | undefined) || null;
    return this.svc.create(dto, { ipAddress: ipRaw, userAgent: ua });
  }

  // ---- Admin endpoints ----
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/leads')
  list(
    @Query('status') status?: LeadStatus,
    @Query('source') source?: LeadSource,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findFiltered({
      status,
      source,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('admin/leads/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    const updated = await this.svc.update(id, dto);
    await this.audit.logAction(req.user.id, 'lead.update', 'lead_request', id, {
      status: dto.status,
      hasNotes: dto.notes !== undefined,
    });
    return updated;
  }
}
