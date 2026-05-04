import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-session')
  async createSession(@Body() body: any) {
    return this.paymentsService.createCheckoutForm(body);
  }

  @Post('callback')
  async callback(@Body() body: any, @Res() res: any) {
    const result: any = await this.paymentsService.retrieveCheckoutResult(body.token);
    
    if (result.status === 'success') {
      // Redirect to success page or handle in Flutter
      return res.redirect('hizmetapp://payment-success');
    } else {
      return res.redirect('hizmetapp://payment-failure');
    }
  }
}
