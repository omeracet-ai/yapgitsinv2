import { Controller, Post, Body, Res, Get, UseGuards, Req, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreateCheckoutFormDto } from './dto/create-checkout-form.dto';
import { IyzipayCallbackDto } from './dto/iyzipay-callback.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
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
  // Phase 245 — `@Body() body: any` → `CreateCheckoutFormDto`, free-form
  // identityNumber / userId injection vektörü kapatıldı.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('create-session')
  async createSession(@Body() dto: CreateCheckoutFormDto) {
    return this.paymentsService.createCheckoutForm(dto);
  }

  // Legacy: Iyzipay Callback
  // Phase 245 — Record<string,string> → IyzipayCallbackDto.
  @Post('callback')
  async callback(@Body() dto: IyzipayCallbackDto, @Res() res: Response) {
    const result = await this.paymentsService.retrieveCheckoutResult(dto.token);

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
  // Phase 245 — DTO upgrade. Token-based re-verify zaten ASIL güvenlik katmanı.
  @SkipThrottle()
  @Post('iyzipay/callback')
  @HttpCode(HttpStatus.OK)
  async iyzipayCallback(@Body() dto: IyzipayCallbackDto) {
    if (!dto.token) throw new BadRequestException('Missing token');
    const escrow = await this.escrowService.confirmByToken(dto.token);
    return { status: escrow.paymentStatus, escrowId: escrow.id };
  }

  // Phase 163: Webhook for payment provider events
  // P191/5 — @SkipThrottle: webhook is provider-originated, signature-validated.
  // Phase 245 — KRİTİK FIX: önceden `event: any` + signature verification YOK.
  // WebhookSignatureGuard HMAC-SHA256 ile imza doğrular (PAYMENTS_WEBHOOK_SECRET
  // ya da IYZICO_WEBHOOK_SECRET env var üzerinden). Prod'da secret zorunlu;
  // non-prod ortamda (e2e dahil) bypass + warn log.
  @SkipThrottle()
  @UseGuards(WebhookSignatureGuard)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() event: WebhookEventDto) {
    await this.paymentsService.handlePaymentWebhook(event);
    return { received: true };
  }
}
