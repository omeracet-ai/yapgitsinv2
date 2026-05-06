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
import { CategoriesModule } from '../categories/categories.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Offer, User, ServiceRequest, Booking, Review]),
    CategoriesModule,
    ProvidersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
