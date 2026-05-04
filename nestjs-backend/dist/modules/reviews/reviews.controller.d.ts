import { ReviewsService } from './reviews.service';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(data: any, req: any): Promise<import("./review.entity").Review>;
    findByReviewee(id: string): Promise<import("./review.entity").Review[]>;
    findByJob(jobId: string): Promise<import("./review.entity").Review[]>;
}
