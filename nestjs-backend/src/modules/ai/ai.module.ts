import { Module } from '@nestjs/common';
import { AiController, AiPublicController } from './ai.controller';
import { AiService } from './ai.service';
import { FraudDetectionService } from './fraud-detection.service';
import { SemanticSearchService } from './semantic-search.service';
import { PricingService } from './pricing.service';
import { DisputeMediationService } from './dispute-mediation.service';

@Module({
  controllers: [AiController, AiPublicController],
  providers: [AiService, FraudDetectionService, SemanticSearchService, PricingService, DisputeMediationService],
  exports: [AiService, FraudDetectionService, SemanticSearchService, PricingService, DisputeMediationService],
})
export class AiModule {}
