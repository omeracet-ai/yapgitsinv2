import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
export declare enum OfferStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    WITHDRAWN = "withdrawn",
    COUNTERED = "countered"
}
export declare class Offer {
    id: string;
    jobId: string;
    job: Job;
    userId: string;
    user: User;
    price: number;
    message: string;
    status: OfferStatus;
    counterPrice: number | null;
    counterMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}
