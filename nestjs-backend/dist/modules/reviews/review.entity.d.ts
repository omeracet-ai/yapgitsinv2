import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
export declare class Review {
    id: string;
    jobId: string | null;
    job: Job | null;
    reviewerId: string;
    reviewer: User;
    revieweeId: string;
    reviewee: User;
    rating: number;
    comment: string;
    createdAt: Date;
}
