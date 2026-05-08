import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneralDisputesService } from './general-disputes.service';
import type {
  CreateDisputeDto,
  ResolveDisputeDto,
} from './general-disputes.service';
import { GeneralDisputeStatus } from './dispute.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';

interface JwtRequest {
  user: { sub?: string; userId?: string; id?: string; role?: string };
}

function uid(req: JwtRequest): string {
  return req.user.sub || req.user.userId || req.user.id || '';
}

function ensureAdmin(req: JwtRequest): void {
  if (req.user.role !== 'admin') throw new ForbiddenException('Admin only');
}

@Controller('disputes')
@UseGuards(AuthGuard('jwt'))
export class GeneralDisputesController {
  constructor(private readonly svc: GeneralDisputesService) {}

  @Post()
  create(@Req() req: JwtRequest, @Body() body: CreateDisputeDto) {
    return this.svc.create(uid(req), body);
  }

  @Get('mine')
  mine(@Req() req: JwtRequest) {
    return this.svc.findMine(uid(req));
  }
}

@Controller('admin/disputes')
@UseGuards(AuthGuard('jwt'))
export class AdminGeneralDisputesController {
  constructor(
    private readonly svc: GeneralDisputesService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('list')
  list(
    @Req() req: JwtRequest,
    @Query('status') status?: GeneralDisputeStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    ensureAdmin(req);
    return this.svc.findForAdmin(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch('general/:id/resolve')
  async resolve(
    @Req() req: JwtRequest,
    @Param('id') id: string,
    @Body() body: ResolveDisputeDto,
  ) {
    ensureAdmin(req);
    const result = await this.svc.resolve(id, uid(req), body);
    await this.audit.logAction(
      uid(req),
      'dispute.resolve',
      'dispute',
      id,
      body as unknown as Record<string, unknown>,
    );
    return result;
  }
}
