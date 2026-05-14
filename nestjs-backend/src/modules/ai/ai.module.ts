import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController, AiPublicController } from './ai.controller';
import { AiService } from './ai.service';
import { FraudDetectionService } from './fraud-detection.service';
import { SemanticSearchService } from './semantic-search.service';
import { PricingService } from './pricing.service';
import { DisputeMediationService } from './dispute-mediation.service';
import { TranslateService } from './translate.service';
import { RecommendationService } from './recommendation.service';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, User])],
  controllers: [AiController, AiPublicController],
  providers: [
    AiService,
    FraudDetectionService,
    SemanticSearchService,
    PricingService,
    DisputeMediationService,
    TranslateService,
    RecommendationService,
  ],
  exports: [
    AiService,
    FraudDetectionService,
    SemanticSearchService,
    PricingService,
    DisputeMediationService,
    TranslateService,
    RecommendationService,
  ],
})
export class AiModule {}
