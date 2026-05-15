import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenTransaction } from './token-transaction.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';
import { WalletPdfService } from './wallet-pdf.service';
import { IyzipayService } from '../escrow/iyzipay.service';

@Module({
  imports: [TypeOrmModule.forFeature([TokenTransaction, User, Notification])],
  controllers: [TokensController],
  // IyzipayService stateless (env-driven), aynı sınıfı EscrowModule da kullanıyor —
  // her modülde ayrı instance üretmek güvenli (singleton state yok).
  providers: [TokensService, WalletPdfService, IyzipayService],
  exports: [TokensService],
})
export class TokensModule {}
