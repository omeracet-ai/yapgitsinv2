import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DisputesService } from './disputes.service';
import type { ResolveDisputeDto } from './disputes.service';

interface JwtRequest {
  user: { sub: string; userId?: string; role?: string };
}

function uid(req: JwtRequest): string {
  return req.user.sub || req.user.userId || '';
}

function ensureAdmin(req: JwtRequest): void {
  if (req.user.role !== 'admin') {
    throw new ForbiddenException('Admin only');
  }
}

@Controller('admin/disputes')
@UseGuards(AuthGuard('jwt'))
export class AdminDisputesController {
  constructor(private readonly svc: DisputesService) {}

  @Get()
  list(@Req() req: JwtRequest) {
    ensureAdmin(req);
    return this.svc.findOpenDisputes();
  }

  @Get(':id')
  detail(@Req() req: JwtRequest, @Param('id') id: string) {
    ensureAdmin(req);
    return this.svc.findById(id, uid(req), true);
  }

  @Patch(':id/under-review')
  markUnderReview(@Req() req: JwtRequest, @Param('id') id: string) {
    ensureAdmin(req);
    return this.svc.markUnderReview(id, uid(req));
  }

  @Patch(':id/resolve')
  resolve(
    @Req() req: JwtRequest,
    @Param('id') id: string,
    @Body() body: ResolveDisputeDto,
  ) {
    ensureAdmin(req);
    return this.svc.resolve(id, uid(req), body);
  }

  @Patch(':id/dismiss')
  dismiss(
    @Req() req: JwtRequest,
    @Param('id') id: string,
    @Body() body: { notes: string },
  ) {
    ensureAdmin(req);
    return this.svc.dismiss(id, uid(req), body.notes);
  }
}

@Controller('disputes')
@UseGuards(AuthGuard('jwt'))
export class DisputesController {
  constructor(private readonly svc: DisputesService) {}

  @Get('my')
  my(@Req() req: JwtRequest) {
    return this.svc.findMine(uid(req));
  }

  @Get('by-job/:jobId')
  byJob(@Param('jobId') jobId: string) {
    return this.svc.findByJob(jobId);
  }

  @Get(':id')
  detail(@Req() req: JwtRequest, @Param('id') id: string) {
    const isAdmin = req.user.role === 'admin';
    return this.svc.findById(id, uid(req), isAdmin);
  }
}
