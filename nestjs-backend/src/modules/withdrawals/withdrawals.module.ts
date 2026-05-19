import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { Payment } from '../payments/payment.entity';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsAdminController } from './withdrawals-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WithdrawalRequest, Payment])],
  controllers: [WithdrawalsController, WithdrawalsAdminController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
