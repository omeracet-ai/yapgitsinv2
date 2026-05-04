import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
