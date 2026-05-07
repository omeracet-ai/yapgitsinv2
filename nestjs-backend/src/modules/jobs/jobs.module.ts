import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Offer } from './offer.entity';
import { JobQuestion } from './job-question.entity';
import { JobQuestionReply } from './job-question-reply.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { OffersService } from './offers.service';
import { OffersController, OffersRootController } from './offers.controller';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Offer, JobQuestion, JobQuestionReply]),
    UsersModule,
    TokensModule,
    NotificationsModule,
  ],
  providers: [JobsService, OffersService, QuestionsService],
  controllers: [JobsController, OffersController, OffersRootController, QuestionsController],
  exports: [JobsService, OffersService],
})
export class JobsModule {}
