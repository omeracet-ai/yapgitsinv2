import { Repository } from 'typeorm';
import { SavedJob } from './saved-job.entity';
import { Job, JobStatus } from './job.entity';
export interface SavedJobPublic {
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    budgetMin: number | null;
    budgetMax: number | null;
    status: JobStatus;
    photos: string[] | null;
    customerId: string;
    createdAt: Date;
    dueDate: string | null;
    savedAt: Date;
}
export declare class SavedJobsService {
    private readonly savedRepo;
    private readonly jobRepo;
    constructor(savedRepo: Repository<SavedJob>, jobRepo: Repository<Job>);
    saveJob(userId: string, jobId: string): Promise<{
        saved: true;
        jobId: string;
    }>;
    unsaveJob(userId: string, jobId: string): Promise<{
        saved: false;
        jobId: string;
    }>;
    listSaved(userId: string): Promise<{
        data: SavedJobPublic[];
        total: number;
    }>;
}
