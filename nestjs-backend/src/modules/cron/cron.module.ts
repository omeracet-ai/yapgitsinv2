import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Notification } from '../notifications/notification.entity';
import { SavedJobSearch } from '../favorites/saved-job-search.entity';
import { Booking } from '../bookings/booking.entity';
import { ReviewReminderService } from './review-reminder.service';
import { SavedSearchAlertService } from './saved-search-alert.service';
import { BoostExpiryService } from './boost-expiry.service';
import { WorkerBoostExpiryService } from './worker-boost-expiry.service';
import { BookingReminderService } from './booking-reminder.service';
import { BoostModule } from '../boost/boost.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Offer, Review, Notification, SavedJobSearch, Booking]),
    BoostModule,
  ],
  providers: [
    ReviewReminderService,
    SavedSearchAlertService,
    BoostExpiryService,
    WorkerBoostExpiryService,
    BookingReminderService,
  ],
})
export class CronModule {}
