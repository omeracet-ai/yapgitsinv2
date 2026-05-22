import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CryptoDepositsService } from './crypto-deposits.service';
import { CreateCryptoDepositDto } from './dto/create-crypto-deposit.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';

@Controller('crypto-deposits')
@UseGuards(AuthGuard('jwt'))
export class CryptoDepositsController {
  constructor(private readonly svc: CryptoDepositsService) {}

  /** Yatırım yapılacak USDT-TRC20 cüzdan adresi + uyarı. */
  @Get('address')
  getAddress() {
    return this.svc.getAddress();
  }

  /** Yeni yatırım talebi (TxID + tutar). Admin onayı bekler. */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCryptoDepositDto,
  ) {
    return this.svc.create(req.user.id, dto);
  }

  /** Kullanıcının yatırım geçmişi (tekrar işlem için). */
  @Get('my')
  listMine(@Request() req: AuthenticatedRequest) {
    return this.svc.listMine(req.user.id);
  }
}
