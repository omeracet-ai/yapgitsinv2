import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Booking } from '../bookings/booking.entity';
import { PaymentEscrow } from '../escrow/payment-escrow.entity';
import { Payment } from '../payments/payment.entity';
import { Review } from '../reviews/review.entity';
import { JobLead } from '../leads/job-lead.entity';
import { JobLeadResponse } from '../leads/job-lead-response.entity';
import { Category } from '../categories/category.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { JobQuestion } from '../jobs/job-question.entity';
import { JobQuestionReply } from '../jobs/job-question-reply.entity';
import { Provider } from '../providers/provider.entity';
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
      ServiceRequest,
      Job,
      Offer,
      JobQuestion,
      JobQuestionReply,
      Provider,
    ]),
  ],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedModule.name);

  onModuleInit(): void {
    if (process.env.ALLOW_SEED === '1') {
      this.logger.warn(
        '[WARN] AdminSeedController is in BOOTSTRAP MODE (ALLOW_SEED=1). Disable after use.',
      );
    }
  }
}
