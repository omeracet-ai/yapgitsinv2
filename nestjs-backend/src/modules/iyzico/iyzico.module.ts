import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IyzicoController } from './iyzico.controller';
import { IyzicoService } from './iyzico.service';
import { Payment } from '../payments/payment.entity';

/**
 * Phase 248-FU (Voldi-fs) — iyzico 3DS module.
 *
 * Mevcut `payments` ve `escrow` modülleriyle çakışmaz: bu modül yeni
 * `/iyzico/3ds/*` endpoint'lerini sağlar; escrow/Checkout Form akışı dokunulmaz.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Payment])],
  controllers: [IyzicoController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class IyzicoModule {}
