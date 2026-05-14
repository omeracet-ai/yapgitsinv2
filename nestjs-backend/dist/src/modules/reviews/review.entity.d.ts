import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
export declare class Review {
    id: string;
    tenantId: string | null;
    jobId: string | null;
    job: Job | null;
    reviewerId: string;
    reviewer: User;
    revieweeId: string;
    reviewee: User;
    rating: number;
    comment: string;
    replyText: string | null;
    repliedAt: Date | null;
    photos: string[] | null;
    helpfulCount: number;
    flagged: boolean;
    flagReason: string | null;
    fraudScore: number | null;
    deletedAt: Date | null;
    createdAt: Date;
}
