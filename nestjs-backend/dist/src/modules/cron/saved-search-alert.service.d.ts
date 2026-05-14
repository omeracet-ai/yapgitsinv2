import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Notification } from '../notifications/notification.entity';
import { SavedJobSearch } from '../favorites/saved-job-search.entity';
export declare class SavedSearchAlertService {
    private readonly searchRepo;
    private readonly jobRepo;
    private readonly notifRepo;
    private readonly logger;
    constructor(searchRepo: Repository<SavedJobSearch>, jobRepo: Repository<Job>, notifRepo: Repository<Notification>);
    runAlerts(): Promise<void>;
}
