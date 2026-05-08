import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { User } from '../users/user.entity';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode, PromoRedemption, User]), AdminAuditModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
