import { ReviewsService } from './reviews.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(data: Record<string, unknown>, req: AuthenticatedRequest): Promise<import("./review.entity").Review>;
    findByReviewee(id: string): Promise<import("./review.entity").Review[]>;
    findByJob(jobId: string): Promise<import("./review.entity").Review[]>;
}
