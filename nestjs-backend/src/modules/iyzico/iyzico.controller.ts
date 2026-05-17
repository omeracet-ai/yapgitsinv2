import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IyzicoService } from './iyzico.service';
import { ThreeDsInitDto } from './dto/threeds-init.dto';
import { ThreeDsCallbackDto } from './dto/threeds-callback.dto';
import { Payment, PaymentMethod, PaymentStatus } from '../payments/payment.entity';

/**
 * Phase 248-FU (Voldi-fs) — iyzico 3DS endpoints.
 *
 * /iyzico/3ds/init      — auth'lu, kart bilgilerini alır, threeDSHtmlContent döner
 * /iyzico/3ds/callback  — iyzipay → bizim sunucumuza form-encoded POST (auth YOK)
 *                          mdStatus === '1' ise threedsPayment.create ile finalize
 */
@Controller('iyzico')
export class IyzicoController {
  private readonly logger = new Logger(IyzicoController.name);

  constructor(
    private readonly iyzico: IyzicoService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  /** Step 1 — Init 3DS for an authenticated user. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('jwt'))
  @Post('3ds/init')
  @HttpCode(HttpStatus.OK)
  async init(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: ThreeDsInitDto,
  ) {
    const userId = req.user?.id ?? dto.buyerId;
    const buyerIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      '85.34.78.112';

    const init = await this.iyzico.threeDsInitialize(dto, buyerIp);

    // Persist a PENDING payment so we can correlate the callback later.
    const amountMinor = Math.round(parseFloat(dto.paidPrice) * 100);
    const payment = this.paymentRepo.create({
      customerId: userId,
      workerId: userId, // placeholder; real workerId set on confirm/booking link
      bookingId: null,
      amountMinor,
      currency: dto.currency,
      status: PaymentStatus.PROCESSING,
      method: PaymentMethod.IYZIPAY,
      description: dto.itemName || `iyzico 3DS basket=${dto.basketId}`,
      iyzipayPaymentId: init.paymentId,
      paymentIntentId: init.conversationId,
      providerRequestId: init.conversationId,
    });
    await this.paymentRepo.save(payment);

    return {
      paymentId: init.paymentId,
      conversationId: init.conversationId,
      threeDSHtmlContent: init.threeDSHtmlContent,
      paymentRecordId: payment.id,
      mock: init.mock,
    };
  }

  /** Step 2 — Bank ACS → iyzipay → us. Form-encoded POST. No auth. */
  @SkipThrottle()
  @Post('3ds/callback')
  async callback(
    @Body() dto: ThreeDsCallbackDto,
    @Res() res: Response,
  ) {
    // 3DS auth failed at bank — short-circuit.
    if (dto.mdStatus && dto.mdStatus !== '1') {
      this.logger.warn(
        `3DS bank-side auth failed paymentId=${dto.paymentId} mdStatus=${dto.mdStatus}`,
      );
      await this.markPayment(dto.paymentId, PaymentStatus.FAILED, {
        errorMessage: `3DS mdStatus=${dto.mdStatus}`,
      });
      return res.redirect(this.iyzico.failRedirect());
    }

    const result = await this.iyzico.threeDsFinalize(
      dto.paymentId,
      dto.conversationId,
    );

    if (result.status !== 'success') {
      await this.markPayment(dto.paymentId, PaymentStatus.FAILED, {
        errorMessage: result.errorMessage || 'iyzico finalize failed',
      });
      return res.redirect(this.iyzico.failRedirect());
    }

    await this.markPayment(dto.paymentId, PaymentStatus.COMPLETED, {
      externalTransactionId: result.paymentTransactionId,
      completedAt: new Date(),
    });
    return res.redirect(this.iyzico.successRedirect());
  }

  private async markPayment(
    iyzipayPaymentId: string,
    status: PaymentStatus,
    patch: Partial<Payment>,
  ): Promise<void> {
    const payment = await this.paymentRepo.findOne({
      where: { iyzipayPaymentId },
    });
    if (!payment) {
      this.logger.warn(
        `callback for unknown iyzipayPaymentId=${iyzipayPaymentId} (no payment row)`,
      );
      return;
    }
    // Idempotency — don't overwrite terminal states.
    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.warn(
        `callback replay ignored for paymentId=${payment.id} (status=${payment.status})`,
      );
      return;
    }
    Object.assign(payment, patch, { status });
    await this.paymentRepo.save(payment);
  }
}
