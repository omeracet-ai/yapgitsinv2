import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
export declare class BoostExpiryService {
    private readonly jobRepo;
    private readonly logger;
    constructor(jobRepo: Repository<Job>);
    expireBoosts(): Promise<void>;
}
