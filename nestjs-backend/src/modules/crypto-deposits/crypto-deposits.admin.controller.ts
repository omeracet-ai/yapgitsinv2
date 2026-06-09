import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Audit } from '../admin-audit/audit.decorator';
import { AuditInterceptor } from '../admin-audit/audit.interceptor';
import { CryptoDepositsService } from './crypto-deposits.service';
import { ReviewCryptoDepositDto } from './dto/review-crypto-deposit.dto';
import type { Request } from 'express';
import type { AuthUser } from '../../common/types/auth.types';

@SkipThrottle({ default: true })
@Controller('admin/crypto-deposits')
@UseGuards(AuthGuard('jwt'), AdminGuard)
@UseInterceptors(AuditInterceptor)
@RequirePermission('crypto-deposits')
export class CryptoDepositsAdminController {
  constructor(private readonly svc: CryptoDepositsService) {}

  /** Yatırım talepleri (varsayılan: hepsi). ?status=pending|approved|rejected */
  @Get()
  list(@Query('status') status?: string) {
    return this.svc.adminList(status);
  }

  /** Onayla → Kredi yükle. */
  @Audit('crypto.deposit.approve')
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ReviewCryptoDepositDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.svc.approve(id, req.user.id, dto);
  }

  /** Reddet. */
  @Audit('crypto.deposit.reject')
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ReviewCryptoDepositDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.svc.reject(id, req.user.id, dto);
  }
}
