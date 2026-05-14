import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
export declare class RecommendationService {
    private jobsRepo;
    private usersRepo;
    private configService;
    private readonly logger;
    private readonly client;
    constructor(jobsRepo: Repository<Job>, usersRepo: Repository<User>, configService: ConfigService);
    recommendWorkersForJob(jobId: string): Promise<User[]>;
    recommendJobsForWorker(workerId: string): Promise<Job[]>;
}
