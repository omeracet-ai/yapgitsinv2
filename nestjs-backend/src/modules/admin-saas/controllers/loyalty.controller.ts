import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { LoyaltyAdminService } from '../services/loyalty.service';
import type { AuthUser } from '../../../common/types/auth.types';

interface GrantBody {
  userId: string;
  points: number;
  reason?: string;
}

/**
 * M10 — Loyalty admin dashboard.
 * Tier inference from existing asCustomerSuccess + asWorkerSuccess.
 * Bonus grant logged to loyalty_transactions.
 */
@Controller('admin/loyalty')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@RequirePermission('loyalty')
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyAdminService) {}

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    const n = Math.min(200, Math.max(1, Number(limit ?? 50)));
    return this.svc.leaderboard(n);
  }

  @Get('tier-stats')
  tierStats() {
    return this.svc.tierStats();
  }

  @Get('transactions')
  transactions(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    const n = Math.min(200, Math.max(1, Number(limit ?? 50)));
    return this.svc.listTransactions(userId, n);
  }

  @Post('grant')
  grant(
    @Body() body: GrantBody,
    @Req() req: Request & { user?: AuthUser },
  ) {
    if (!body?.userId) throw new BadRequestException('userId required');
    const points = Math.floor(Number(body.points));
    if (!Number.isFinite(points) || points === 0) {
      throw new BadRequestException('points sıfır olmayan tamsayı olmalı');
    }
    return this.svc.grant(body.userId, points, body.reason, req.user?.id);
  }
}
