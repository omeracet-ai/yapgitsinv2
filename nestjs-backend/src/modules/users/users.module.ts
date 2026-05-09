import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User } from './user.entity';
import { FavoriteWorker } from './favorite-worker.entity';
import { WorkerInsurance } from './worker-insurance.entity';
import { DataDeletionRequest } from './data-deletion-request.entity';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { WorkerInsuranceService } from './worker-insurance.service';
import { DataPrivacyService } from './data-privacy.service';
import { CalendarSyncService } from './calendar-sync.service';
import { UsersController } from './users.controller';
import { Job } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Notification } from '../notifications/notification.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { EarningsService } from './earnings.service';
import { AiModule } from '../ai/ai.module';
import { BoostModule } from '../boost/boost.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, FavoriteWorker, WorkerInsurance, DataDeletionRequest,
      Job, Review, Offer, Booking, Notification, ChatMessage, TokenTransaction,
    ]),
    AiModule,
    BoostModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, FavoriteWorkersService, EarningsService, WorkerInsuranceService, DataPrivacyService, CalendarSyncService],
  exports: [UsersService, WorkerInsuranceService, DataPrivacyService, CalendarSyncService],
})
export class UsersModule {}
