import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoDeposit } from './crypto-deposit.entity';
import { CryptoDepositsService } from './crypto-deposits.service';
import { CryptoDepositsController } from './crypto-deposits.controller';
import { CryptoDepositsAdminController } from './crypto-deposits.admin.controller';
import { TokensModule } from '../tokens/tokens.module';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CryptoDeposit]),
    TokensModule,
    AdminAuditModule,
  ],
  controllers: [CryptoDepositsController, CryptoDepositsAdminController],
  providers: [CryptoDepositsService],
  exports: [CryptoDepositsService],
})
export class CryptoDepositsModule {}
