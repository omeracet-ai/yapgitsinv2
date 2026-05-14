import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
import { Review } from '../reviews/review.entity';
import { Notification } from '../notifications/notification.entity';
export declare class ReviewReminderService {
    private readonly jobRepo;
    private readonly offerRepo;
    private readonly reviewRepo;
    private readonly notifRepo;
    private readonly logger;
    constructor(jobRepo: Repository<Job>, offerRepo: Repository<Offer>, reviewRepo: Repository<Review>, notifRepo: Repository<Notification>);
    sendReminders(): Promise<void>;
}
