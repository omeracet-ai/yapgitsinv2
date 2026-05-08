import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('earnings')
  @UseGuards(AuthGuard('jwt'))
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
      return res.redirect('yapgitsin://payment-success');
    } else {
      return res.redirect('yapgitsin://payment-failure');
    }
  }
}
