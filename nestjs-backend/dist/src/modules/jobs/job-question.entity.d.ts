import { Job } from './job.entity';
import { User } from '../users/user.entity';
export declare class JobQuestion {
    id: string;
    tenantId: string | null;
    jobId: string;
    job: Job;
    userId: string;
    user: User;
    text: string;
    photoUrl: string | null;
    flagged: boolean;
    flagReason: string | null;
    createdAt: Date;
}
