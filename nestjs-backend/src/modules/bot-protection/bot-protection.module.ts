import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedIp } from './blocked-ip.entity';
import { BotProtectionController } from './bot-protection.controller';
import { BotProtectionMiddleware } from './bot-protection.middleware';
import { BotProtectionService } from './bot-protection.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlockedIp])],
  controllers: [BotProtectionController],
  providers: [BotProtectionService],
  exports: [BotProtectionService],
})
export class BotProtectionModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply middleware globally; controller-level exclusions handled inside middleware
    consumer
      .apply(BotProtectionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
