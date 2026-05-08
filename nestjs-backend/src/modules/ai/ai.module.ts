import { Module } from '@nestjs/common';
import { AiController, AiPublicController } from './ai.controller';
import { AiService } from './ai.service';
import { FraudDetectionService } from './fraud-detection.service';

@Module({
  controllers: [AiController, AiPublicController],
  providers: [AiService, FraudDetectionService],
  exports: [AiService, FraudDetectionService],
})
export class AiModule {}
