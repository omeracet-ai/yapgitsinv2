import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PromoService } from './promo.service';
import type {
  AdminCreatePromoDto,
  AdminUpdatePromoDto,
} from './promo.service';

interface AuthedReq {
  user?: { id?: string; sub?: string; userId?: string };
}

function uid(req: AuthedReq): string {
  return req.user?.sub || req.user?.id || req.user?.userId || '';
}

@Controller()
export class PromoController {
  constructor(
    private readonly svc: PromoService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('promo/validate/:code')
  @UseGuards(AuthGuard('jwt'))
  validate(
    @Param('code') code: string,
    @Query('spend') spend: string | undefined,
    @Req() req: AuthedReq,
  ) {
    const spendNum = spend ? Number(spend) : 0;
    return this.svc.validate(code, uid(req), Number.isFinite(spendNum) ? spendNum : 0);
  }

  @Get('promo/:code/validate')
  @UseGuards(AuthGuard('jwt'))
  async validateByPath(
    @Param('code') code: string,
    @Req() req: AuthedReq,
  ) {
    try {
      const result = await this.svc.validate(code, uid(req), 0);
      const promo = await this.svc.findOne(result.codeId);
      return {
        valid: true,
        discount: result.discountValue,
        type: result.discountType as 'percent' | 'fixed',
        description: promo.description ?? '',
      };
    } catch {
      return { valid: false, discount: 0, type: 'percent' as const, description: '' };
    }
  }

  @Post('promo/:code/apply')
  @UseGuards(AuthGuard('jwt'))
  async applyByPath(
    @Param('code') code: string,
    @Req() req: AuthedReq,
  ) {
    const result = await this.svc.redeemByCode(code, uid(req));
    return {
      success: true,
      tokensAdded: result.type === 'bonus_token' ? result.value : undefined,
    };
  }

  // Phase 126: effect-based redeem
  @Post('promo/redeem')
  @UseGuards(AuthGuard('jwt'))
  redeem(@Body() body: { code: string }, @Req() req: AuthedReq) {
    return this.svc.redeemByCode(body?.code ?? '', uid(req));
  }

  // ── Admin CRUD ──────────────────────────────────────────────
  @Get('admin/promos')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  adminList(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.adminList(Number(page) || 1, Number(limit) || 50);
  }

  @Post('admin/promos')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async adminCreate(@Body() body: AdminCreatePromoDto, @Req() req: AuthedReq) {
    const promo = await this.svc.adminCreate(body);
    await this.audit.logAction(uid(req), 'promo.create', 'promo_code', promo.id, {
      code: promo.code,
      type: promo.effectType,
      value: promo.effectValue,
    });
    return promo;
  }

  @Patch('admin/promos/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async adminUpdate(
    @Param('id') id: string,
    @Body() body: AdminUpdatePromoDto,
    @Req() req: AuthedReq,
  ) {
    const promo = await this.svc.adminUpdate(id, body);
    await this.audit.logAction(uid(req), 'promo.update', 'promo_code', id, body as Record<string, unknown>);
    return promo;
  }

  @Delete('admin/promos/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async adminDelete(@Param('id') id: string, @Req() req: AuthedReq) {
    const result = await this.svc.remove(id);
    await this.audit.logAction(uid(req), 'promo.delete', 'promo_code', id);
    return result;
  }
}
