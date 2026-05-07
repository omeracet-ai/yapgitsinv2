import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EscrowService } from './escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('escrow')
@UseGuards(AuthGuard('jwt'))
export class EscrowController {
  constructor(private readonly svc: EscrowService) {}

  @Get('my-as-customer')
  listAsCustomer(@Request() req: AuthenticatedRequest) {
    return this.svc.listForCustomer(req.user.id);
  }

  @Get('my-as-tasker')
  listAsTasker(@Request() req: AuthenticatedRequest) {
    return this.svc.listForTasker(req.user.id);
  }

  @Get('by-job/:jobId')
  async getByJob(
    @Param('jobId') jobId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const escrow = await this.svc.getByJob(jobId, req.user.id, req.user.role);
    if (!escrow) {
      throw new NotFoundException('No escrow found for this job');
    }
    return escrow;
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.getById(id, req.user.id, req.user.role);
  }

  @Patch(':id/dispute')
  dispute(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.svc.dispute(id, req.user.id, body?.reason);
  }
}
