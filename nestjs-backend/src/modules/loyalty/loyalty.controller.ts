import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoyaltyService } from './loyalty.service';

interface AuthedReq {
  user?: { id?: string; sub?: string; userId?: string };
}

function uid(req: AuthedReq): string {
  return req.user?.sub || req.user?.id || req.user?.userId || '';
}

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  getMy(@Req() req: AuthedReq) {
    return this.svc.getMyLoyalty(uid(req));
  }

  @Post('redeem')
  @UseGuards(AuthGuard('jwt'))
  redeem(@Req() req: AuthedReq, @Body() body: { code: string }) {
    return this.svc.redeemReferralCode(uid(req), body?.code);
  }
}
