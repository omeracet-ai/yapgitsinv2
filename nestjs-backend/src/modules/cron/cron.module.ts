import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Notification } from '../notifications/notification.entity';
import { SavedJobSearch } from '../favorites/saved-job-search.entity';
import { ReviewReminderService } from './review-reminder.service';
import { SavedSearchAlertService } from './saved-search-alert.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Offer, Review, Notification, SavedJobSearch])],
  providers: [ReviewReminderService, SavedSearchAlertService],
})
export class CronModule {}
