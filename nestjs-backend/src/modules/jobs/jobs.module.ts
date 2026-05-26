import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { Offer } from './offer.entity';
import { User } from '../users/user.entity';
import { JobQuestion } from './job-question.entity';
import { JobQuestionReply } from './job-question-reply.entity';
import { SavedJob } from './saved-job.entity';
import { Booking } from '../bookings/booking.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { OffersService } from './offers.service';
import { OffersController, OffersRootController } from './offers.controller';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { SavedJobsService } from './saved-jobs.service';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EscrowModule } from '../escrow/escrow.module';
import { CancellationModule } from '../cancellation/cancellation.module';
import { DisputesModule } from '../disputes/disputes.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AiModule } from '../ai/ai.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Offer,
      JobQuestion,
      JobQuestionReply,
      SavedJob,
      // Phase 259 — admin lookup for fraud-flag notifications (read-only).
      User,
      // Teklif kabulü → otomatik randevu (CONFIRMED booking) için.
      Booking,
    ]),
    UsersModule,
    TokensModule,
    NotificationsModule,
    EscrowModule,
    CancellationModule,
    DisputesModule,
    UserBlocksModule,
    SubscriptionsModule,
    AiModule,
    SystemSettingsModule,
  ],
  providers: [JobsService, OffersService, QuestionsService, SavedJobsService],
  controllers: [
    JobsController,
    OffersController,
    OffersRootController,
    QuestionsController,
  ],
  exports: [JobsService, OffersService],
})
export class JobsModule {}
