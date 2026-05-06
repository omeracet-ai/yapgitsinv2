import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  async getEarnings(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.getEarnings(req.user.id);
  }

  @Post('create-session')
  async createSession(@Body() body: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.paymentsService.createCheckoutForm(body);
  }

  @Post('callback')
  async callback(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.paymentsService.retrieveCheckoutResult(
      body.token,
    );

    if ((result as { status: string }).status === 'success') {
      return res.redirect('hizmetapp://payment-success');
    } else {
      return res.redirect('hizmetapp://payment-failure');
    }
  }
}
