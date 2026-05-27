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
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EscrowService } from './escrow.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

class AdminResolveDto {
  @IsIn(['release', 'refund', 'split']) action!: 'release' | 'refund' | 'split';
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

// Phase 267 — Escrow settings DTOs.
class EscrowSettingDto {
  @IsIn([
    'escrow.gps_radius_m',
    'escrow.gps_required',
    'escrow.grace_ms',
    'escrow.deadline_ms',
  ])
  key!:
    | 'escrow.gps_radius_m'
    | 'escrow.gps_required'
    | 'escrow.grace_ms'
    | 'escrow.deadline_ms';

  @IsOptional() @IsNumber() valueNumber?: number;
  @IsOptional() @IsBoolean() valueBoolean?: boolean;
}

/**
 * Phase 169 — admin-only escrow resolution.
 * Mounted under /admin/escrow to keep semantics aligned with other admin endpoints.
 */
@Controller('admin/escrow')
@UseGuards(AuthGuard('jwt'))
export class EscrowAdminController {
  constructor(
    private readonly svc: EscrowService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

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
    // release() polymorphic: PaymentEscrow → fee breakdown; BookingEscrow
    // (Phase 253 bridge) lacks PaymentEscrow shape, return as-is.
    return 'taskerId' in escrow ? this.svc.withFeeBreakdown(escrow) : escrow;
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

  // Phase 267 — Admin-tunable escrow settings (GPS radius/required, grace, deadline).
  @Get('settings/all')
  async getEscrowSettings(@Request() req: AuthenticatedRequest) {
    this.assertAdmin(req);
    const [gpsRadiusM, gpsRequired, graceMs, deadlineMs] = await Promise.all([
      this.platformSettings.getEscrowGpsRadiusM(),
      this.platformSettings.getEscrowGpsRequired(),
      this.platformSettings.getEscrowGraceMs(),
      this.platformSettings.getEscrowDeadlineMs(),
    ]);
    return {
      'escrow.gps_radius_m': gpsRadiusM,
      'escrow.gps_required': gpsRequired,
      'escrow.grace_ms': graceMs,
      'escrow.deadline_ms': deadlineMs,
    };
  }

  @Patch('settings')
  async updateEscrowSetting(
    @Body() dto: EscrowSettingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertAdmin(req);

    // Boolean-typed key
    if (dto.key === 'escrow.gps_required') {
      if (typeof dto.valueBoolean !== 'boolean') {
        throw new ForbiddenException(
          'valueBoolean required for escrow.gps_required',
        );
      }
      await this.platformSettings.setValue(
        dto.key,
        dto.valueBoolean ? 'true' : 'false',
        req.user.id,
      );
      return { key: dto.key, value: dto.valueBoolean };
    }

    // Numeric keys
    if (typeof dto.valueNumber !== 'number' || !Number.isFinite(dto.valueNumber)) {
      throw new ForbiddenException(`valueNumber required for ${dto.key}`);
    }
    // Sanity bounds — keep admin from typing 0 or absurd values.
    const bounds: Record<string, [number, number]> = {
      'escrow.gps_radius_m': [10, 50_000],
      'escrow.grace_ms': [60_000, 24 * 60 * 60 * 1000],
      'escrow.deadline_ms': [60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000],
    };
    const [lo, hi] = bounds[dto.key] ?? [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    if (dto.valueNumber < lo || dto.valueNumber > hi) {
      throw new ForbiddenException(
        `${dto.key} out of bounds [${lo}, ${hi}]`,
      );
    }
    await this.platformSettings.setValue(
      dto.key,
      String(dto.valueNumber),
      req.user.id,
    );
    return { key: dto.key, value: dto.valueNumber };
  }
}
