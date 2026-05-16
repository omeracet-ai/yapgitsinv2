import { Module } from '@nestjs/common';
import { HealthController, HealthzController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController, HealthzController],
  providers: [HealthService],
})
export class HealthModule {}
