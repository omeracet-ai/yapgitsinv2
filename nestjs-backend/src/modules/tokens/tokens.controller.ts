import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokensService } from './tokens.service';
import { PaymentMethod } from './token-transaction.entity';
import { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('tokens')
@UseGuards(AuthGuard('jwt'))
export class TokensController {
  constructor(private readonly svc: TokensService) {}

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
}
