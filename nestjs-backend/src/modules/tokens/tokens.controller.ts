import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { TokensService } from './tokens.service';
import { WalletPdfService } from './wallet-pdf.service';
import { PaymentMethod } from './token-transaction.entity';
import { GiftTokensDto } from './dto/gift-tokens.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('tokens')
export class TokensController {
  constructor(
    private readonly svc: TokensService,
    private readonly pdfSvc: WalletPdfService,
  ) {}

  /** GET /tokens/packages — public katalog (auth gerekmez, paket göstermek için). */
  @Get('packages')
  listPackages() {
    return { packages: this.svc.listPackages() };
  }

  @Get('history/pdf')
  @UseGuards(AuthGuard('jwt'))
  async historyPdf(
    @Request() req: AuthenticatedRequest,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const buf = await this.pdfSvc.generatePdf(req.user.id, fromDate, toDate);
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="yapgitsin-cuzdan-${req.user.id}-${dateStr}.pdf"`,
    );
    res.setHeader('Content-Length', buf.length.toString());
    res.end(buf);
  }

  @Get('balance')
  @UseGuards(AuthGuard('jwt'))
  getBalance(@Request() req: AuthenticatedRequest) {
    return this.svc.getBalance(req.user.id);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  getHistory(@Request() req: AuthenticatedRequest) {
    return this.svc.getHistory(req.user.id);
  }

  @Post('purchase')
  @UseGuards(AuthGuard('jwt'))
  purchase(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount: number; paymentMethod: 'bank' | 'crypto' },
  ) {
    const method =
      body.paymentMethod === 'bank' ? PaymentMethod.BANK : PaymentMethod.CRYPTO;
    return this.svc.purchase(req.user.id, body.amount, method);
  }

  @Post('gift')
  @UseGuards(AuthGuard('jwt'))
  gift(@Request() req: AuthenticatedRequest, @Body() dto: GiftTokensDto) {
    return this.svc.giftTokens(req.user.id, dto);
  }

  /**
   * POST /tokens/checkout — iyzipay üzerinden jeton satın alma.
   * Body: { packageId: string }  (fiyat ASLA client'tan gelmez — server-side katalog.)
   * P191/5 — 10/min throttle (PSP istek bombalamasını engelle).
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Request() req: AuthenticatedRequest,
    @Body() body: { packageId?: string },
  ) {
    if (!body?.packageId) throw new BadRequestException('packageId zorunlu');
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip;
    return this.svc.createIyzipayCheckout(req.user.id, body.packageId, { ip });
  }

  /**
   * POST /tokens/iyzipay/callback — iyzipay → bize POST eder ({ token }).
   * Auth yok (provider çağrısı), token re-verify gates abuse.
   * @SkipThrottle: provider callback'leri IP-throttle edilmez.
   */
  @SkipThrottle()
  @Post('iyzipay/callback')
  @HttpCode(HttpStatus.OK)
  async iyzipayCallback(@Body() body: Record<string, string>) {
    const token = body?.token;
    if (!token) throw new BadRequestException('Missing token');
    return this.svc.confirmIyzipayCheckout(token);
  }
}
