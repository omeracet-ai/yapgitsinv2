import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PromoService } from './promo.service';

interface AuthedReq {
  user?: { id?: string; sub?: string; userId?: string };
}

function uid(req: AuthedReq): string {
  return req.user?.sub || req.user?.id || req.user?.userId || '';
}

@Controller('promo')
export class PromoController {
  constructor(private readonly svc: PromoService) {}

  @Get('validate/:code')
  @UseGuards(AuthGuard('jwt'))
  validate(
    @Param('code') code: string,
    @Query('spend') spend: string | undefined,
    @Req() req: AuthedReq,
  ) {
    const spendNum = spend ? Number(spend) : 0;
    return this.svc.validate(code, uid(req), Number.isFinite(spendNum) ? spendNum : 0);
  }

  @Post('redeem')
  @UseGuards(AuthGuard('jwt'))
  redeem(
    @Body()
    body: { code: string; refType?: string; refId?: string; spend?: number },
    @Req() req: AuthedReq,
  ) {
    return this.svc.redeem(
      body.code,
      uid(req),
      body.refType,
      body.refId,
      body.spend ?? 0,
    );
  }
}
