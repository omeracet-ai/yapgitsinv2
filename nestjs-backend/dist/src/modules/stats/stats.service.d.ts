import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
export interface PublicStats {
    totalJobs: number;
    totalWorkers: number;
    completedJobs: number;
    totalCategories: number;
}
export declare class StatsService {
    private readonly jobRepo;
    private readonly userRepo;
    private readonly categoryRepo;
    private readonly logger;
    private readonly cache;
    constructor(jobRepo: Repository<Job>, userRepo: Repository<User>, categoryRepo: Repository<Category>);
    getPublicStats(): Promise<PublicStats>;
}
