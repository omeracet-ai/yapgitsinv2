import { Job } from './job.entity';
export declare class SavedJob {
    id: string;
    tenantId: string | null;
    userId: string;
    jobId: string;
    job: Job;
    createdAt: Date;
}
