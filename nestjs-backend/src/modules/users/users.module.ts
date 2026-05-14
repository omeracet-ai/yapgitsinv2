import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User } from './user.entity';
import { FavoriteWorker } from './favorite-worker.entity';
import { WorkerInsurance } from './worker-insurance.entity';
import { WorkerCertification } from './worker-certification.entity';
import { DataDeletionRequest } from './data-deletion-request.entity';
import { UsersService } from './users.service';
import { FavoriteWorkersService } from './favorite-workers.service';
import { WorkerInsuranceService } from './worker-insurance.service';
import { WorkerCertificationService } from './worker-certification.service';
import { DataPrivacyService } from './data-privacy.service';
import { CalendarSyncService } from './calendar-sync.service';
import { CalendarService } from './calendar.service';
import { CalendarController, CalendarPublicController } from './calendar.controller';
import { UsersController } from './users.controller';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Job } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer } from '../jobs/offer.entity';
import { Booking } from '../bookings/booking.entity';
import { Notification } from '../notifications/notification.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { TokenTransaction } from '../tokens/token-transaction.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { EarningsService } from './earnings.service';
import { AiModule } from '../ai/ai.module';
import { BoostModule } from '../boost/boost.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, FavoriteWorker, WorkerInsurance, WorkerCertification, DataDeletionRequest,
      Job, Review, Offer, Booking, Notification, ChatMessage, TokenTransaction,
      Payment, PaymentEscrow, JobLead, JobLeadResponse,
    ]),
    AiModule,
    BoostModule,
    AvailabilityModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [CalendarController, CalendarPublicController, UsersController, WalletController, DataExportController],
  providers: [UsersService, FavoriteWorkersService, EarningsService, WorkerInsuranceService, WorkerCertificationService, DataPrivacyService, CalendarSyncService, CalendarService, WalletService, DataExportService],
  exports: [UsersService, WorkerInsuranceService, WorkerCertificationService, DataPrivacyService, CalendarSyncService],
})
export class UsersModule {}
