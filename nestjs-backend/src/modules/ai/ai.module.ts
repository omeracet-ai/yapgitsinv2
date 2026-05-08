import { Module } from '@nestjs/common';
import { AiController, AiPublicController } from './ai.controller';
import { AiService } from './ai.service';
import { FraudDetectionService } from './fraud-detection.service';
import { SemanticSearchService } from './semantic-search.service';

@Module({
  controllers: [AiController, AiPublicController],
  providers: [AiService, FraudDetectionService, SemanticSearchService],
  exports: [AiService, FraudDetectionService, SemanticSearchService],
})
export class AiModule {}
