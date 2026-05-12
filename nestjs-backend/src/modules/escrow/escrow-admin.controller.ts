import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EscrowService } from './escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

class AdminResolveDto {
  @IsIn(['release', 'refund', 'split']) action!:
    | 'release'
    | 'refund'
    | 'split';
  @IsOptional() @IsNumber() @Min(0) @Max(1) splitRatio?: number;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(2000) adminNote?: string;
}

class AdminReasonDto {
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

class AdminRefundDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

/**
 * Phase 169 — admin-only escrow resolution.
 * Mounted under /admin/escrow to keep semantics aligned with other admin endpoints.
 */
@Controller('admin/escrow')
@UseGuards(AuthGuard('jwt'))
export class EscrowAdminController {
  constructor(private readonly svc: EscrowService) {}

  private assertAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
  }

  @Get()
  async listAll(@Request() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    // Reuse listMy with a wildcard would leak; expose minimal admin browsing
    // via the underlying repository.
    return this.svc['repo'].find({ order: { createdAt: 'DESC' }, take: 200 });
  }

  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() dto: AdminResolveDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.svc.adminResolve(id, dto.action, req.user.id, req.user.role, {
      splitRatio: dto.splitRatio,
      reason: dto.reason,
      adminNote: dto.adminNote,
    });
  }

  /** Phase 169 — admin manual release: held → released, worker net + platform fee. */
  @Patch(':id/release')
  async release(
    @Param('id') id: string,
    @Body() dto: AdminReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    const escrow = await this.svc.release(
      id,
      req.user.id,
      dto?.reason,
      req.user.role,
    );
    return this.svc.withFeeBreakdown(escrow);
  }

  /** Phase 169 — admin manual refund: held → refunded (full or partial). */
  @Patch(':id/refund')
  async refund(
    @Param('id') id: string,
    @Body() dto: AdminRefundDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);
    return this.svc.refund(
      id,
      req.user.id,
      dto?.amount,
      dto?.reason,
      req.user.role,
    );
  }
}
