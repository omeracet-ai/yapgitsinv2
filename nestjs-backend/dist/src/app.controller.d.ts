import { Repository } from 'typeorm';
import { AppService } from './app.service';
import { User } from './modules/users/user.entity';
import { Job } from './modules/jobs/job.entity';
export declare class AppController {
    private readonly appService;
    private usersRepo;
    private jobsRepo;
    constructor(appService: AppService, usersRepo: Repository<User>, jobsRepo: Repository<Job>);
    getHello(): string;
    getPublicStats(): Promise<{
        totalUsers: number;
        totalJobs: number;
        totalWorkers: number;
        ts: string;
    }>;
}
