import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { TokensService } from './tokens.service';
import { WalletPdfService } from './wallet-pdf.service';
import { PaymentMethod } from './token-transaction.entity';
import { GiftTokensDto } from './dto/gift-tokens.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('tokens')
@UseGuards(AuthGuard('jwt'))
export class TokensController {
  constructor(
    private readonly svc: TokensService,
    private readonly pdfSvc: WalletPdfService,
  ) {}

  @Get('history/pdf')
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
  getBalance(@Request() req: AuthenticatedRequest) {
    return this.svc.getBalance(req.user.id);
  }

  @Get('history')
  getHistory(@Request() req: AuthenticatedRequest) {
    return this.svc.getHistory(req.user.id);
  }

  @Post('purchase')
  purchase(
    @Request() req: AuthenticatedRequest,
    @Body() body: { amount: number; paymentMethod: 'bank' | 'crypto' },
  ) {
    const method =
      body.paymentMethod === 'bank' ? PaymentMethod.BANK : PaymentMethod.CRYPTO;
    return this.svc.purchase(req.user.id, body.amount, method);
  }

  @Post('gift')
  gift(@Request() req: AuthenticatedRequest, @Body() dto: GiftTokensDto) {
    return this.svc.giftTokens(req.user.id, dto);
  }
}
