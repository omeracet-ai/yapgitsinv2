import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionsController {
  constructor(private readonly subsService: SubscriptionsService) {}

  @Get('plans')
  async listPlans() {
    const plans = await this.subsService.listPlans();
    return plans.map((p) => ({
      key: p.key,
      name: p.name,
      price: p.price,
      period: p.period,
      features: p.features,
    }));
  }

  @Get('my')
  async getMy(@Req() req: { user: { id: string } }) {
    const sub = await this.subsService.getMySubscription(req.user.id);
    if (!sub) return null;
    return {
      plan: {
        key: sub.plan.key,
        name: sub.plan.name,
        price: sub.plan.price,
        period: sub.plan.period,
        features: sub.plan.features,
      },
      status: sub.status,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      cancelledAt: sub.cancelledAt,
    };
  }

  @Post('subscribe')
  async subscribe(
    @Req() req: { user: { id: string } },
    @Body() body: { planKey?: string },
  ) {
    if (!body?.planKey) throw new BadRequestException('planKey zorunlu');
    const r = await this.subsService.subscribe(req.user.id, body.planKey);
    return {
      subscriptionId: r.subscriptionId,
      paymentUrl: r.paymentUrl,
      paymentToken: r.paymentToken,
      mock: r.mock,
    };
  }

  @Post('confirm')
  async confirm(
    @Req() req: { user: { id: string } },
    @Body() body: { token?: string },
  ) {
    if (!body?.token) throw new BadRequestException('token zorunlu');
    return this.subsService.confirmPayment(req.user.id, body.token);
  }

  @Post('cancel')
  async cancel(@Req() req: { user: { id: string } }) {
    return this.subsService.cancel(req.user.id);
  }
}
