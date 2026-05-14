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
    tenantId: string | null;
    jobId: string;
    job: Job;
    userId: string;
    user: User;
    price: number;
    priceMinor: number;
    message: string;
    status: OfferStatus;
    counterPrice: number | null;
    counterPriceMinor: number | null;
    counterMessage: string | null;
    parentOfferId: string | null;
    negotiationRound: number;
    attachmentUrls: string[] | null;
    lineItems: Array<{
        label: string;
        qty: number;
        unitPrice: number;
        total: number;
    }> | null;
    createdAt: Date;
    updatedAt: Date;
}
