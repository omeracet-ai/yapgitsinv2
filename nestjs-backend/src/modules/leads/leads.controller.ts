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
import { JobLeadsService } from './job-leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateJobLeadDto } from './dto/create-job-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import type { AuthUser } from '../../common/types/auth.types';
import type { LeadSource, LeadStatus } from './lead-request.entity';
import type { JobLeadStatus } from './job-lead.entity';

@Controller()
export class LeadsController {
  constructor(
    private readonly svc: LeadsService,
    private readonly jobSvc: JobLeadsService,
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

  // ---- Job Leads (Phase 160) ----
  @Throttle({ default: { limit: 10, ttl: 86_400_000 } })
  @Post('job-leads')
  async createJobLead(
    @Body() dto: CreateJobLeadDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    const customerId = req.user?.id || undefined;
    return this.jobSvc.create(dto, customerId);
  }

  @Get('job-leads/:id')
  async getJobLead(@Param('id') id: string) {
    return this.jobSvc.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('job-leads')
  async getUserJobLeads(
    @Req() req: Request & { user: AuthUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobSvc.findByCustomerId(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('job-leads/:id/status')
  async updateJobLeadStatus(
    @Param('id') id: string,
    @Body() body: { status: JobLeadStatus },
    @Req() req: Request & { user: AuthUser },
  ) {
    const updated = await this.jobSvc.updateStatus(id, body.status);
    await this.audit.logAction(req.user.id, 'job-lead.update', 'leads', id, {
      status: body.status,
    });
    return updated;
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('job-leads/:id/responses')
  async getJobLeadResponses(@Param('id') id: string) {
    return this.jobSvc.getLeadResponses(id);
  }
}
