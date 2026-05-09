import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenTransaction } from './token-transaction.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';
import { WalletPdfService } from './wallet-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([TokenTransaction, User, Notification])],
  controllers: [TokensController],
  providers: [TokensService, WalletPdfService],
  exports: [TokensService],
})
export class TokensModule {}
