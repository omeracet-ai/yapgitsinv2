import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Booking } from '../bookings/booking.entity';
import { Review } from '../reviews/review.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { Notification } from '../notifications/notification.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ProvidersModule } from '../providers/providers.module';
import { PromoModule } from '../promo/promo.module';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Offer, User, ServiceRequest, Booking, Review, PaymentEscrow, ChatMessage, JobQuestion, Notification]),
    CategoriesModule,
    ProvidersModule,
    PromoModule,
    UserBlocksModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
