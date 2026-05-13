import { Controller, Post, Body, Res, Get, UseGuards, Req, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { EscrowService } from '../escrow/escrow.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly escrowService: EscrowService,
  ) {}

  // Phase 163: New Payment Intent API
  // P191/5 — 10/min cap on payment intent creation (abuse + accidental retry storms).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    @Body() dto: CreatePaymentIntentDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.createPaymentIntent(req.user.id, dto);
  }

  // Phase 163: Confirm Payment
  @Post('confirm')
  @UseGuards(AuthGuard('jwt'))
  async confirmPayment(
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    @Body() dto: ConfirmPaymentDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.confirmPayment(req.user.id, dto);
  }

  // Phase 163: Get Payment History (Customer view)
  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  async getPaymentHistory(
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    @Query() query: PaymentHistoryQueryDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.getPaymentHistory(req.user.id, query, false);
  }

  // Phase 163: Get Worker Earnings & Refund History
  @Get('earnings')
  @UseGuards(AuthGuard('jwt'))
  async getEarnings(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.getWorkerEarnings(req.user.id);
  }

  // Phase 163: Refund Payment
  @Post('refund')
  @UseGuards(AuthGuard('jwt'))
  async refundPayment(
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    @Body() dto: RefundPaymentDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.paymentsService.refundPayment(req.user.id, dto);
  }

  // Legacy: Iyzipay Checkout Form
  // P191/5 — 10/min cap (legacy initiate-equivalent).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('create-session')
  async createSession(@Body() body: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.paymentsService.createCheckoutForm(body);
  }

  // Legacy: Iyzipay Callback
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

  // Phase 175: iyzipay Checkout Form callback — iyzipay POSTs { token } here
  // after the customer pays. We re-verify the token server-side (retrieveCheckout)
  // and only then move the escrow to a captured state. No auth: this is iyzipay → us.
  // P191/5 — @SkipThrottle: provider callbacks must not be IP-throttled (token re-verify gates abuse).
  @SkipThrottle()
  @Post('iyzipay/callback')
  @HttpCode(HttpStatus.OK)
  async iyzipayCallback(@Body() body: Record<string, string>) {
    const token = body?.token;
    if (!token) throw new BadRequestException('Missing token');
    const escrow = await this.escrowService.confirmByToken(token);
    return { status: escrow.paymentStatus, escrowId: escrow.id };
  }

  // Phase 163: Webhook for payment provider events
  // P191/5 — @SkipThrottle: webhook is provider-originated, signature-validated.
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() event: any) {
    await this.paymentsService.handlePaymentWebhook(event);
    return { received: true };
  }
}
