import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { Payment } from '../payments/payment.entity';
import { Review } from '../reviews/review.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
import { Category } from '../categories/category.entity';
import { AdminSeedController } from './admin-seed.controller';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Booking,
      PaymentEscrow,
      Payment,
      Review,
      JobLead,
      JobLeadResponse,
      Category,
    ]),
  ],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule {}
