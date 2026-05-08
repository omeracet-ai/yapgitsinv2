import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { FavoriteWorker } from './favorite-worker.entity';
import { WorkerInsurance } from './worker-insurance.entity';
import { DataDeletionRequest } from './data-deletion-request.entity';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { WorkerInsuranceService } from './worker-insurance.service';
import { DataPrivacyService } from './data-privacy.service';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, FavoriteWorker, WorkerInsurance, DataDeletionRequest,
      Job, Review, Offer, Booking, Notification, ChatMessage, TokenTransaction,
    ]),
    AiModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, FavoriteWorkersService, EarningsService, WorkerInsuranceService, DataPrivacyService],
  exports: [UsersService, WorkerInsuranceService, DataPrivacyService],
})
export class UsersModule {}
