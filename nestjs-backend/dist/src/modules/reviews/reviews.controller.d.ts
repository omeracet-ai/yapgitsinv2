import { ReviewsService } from './reviews.service';
import { ReplyReviewDto } from './dto/reply-review.dto';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(data: Record<string, unknown>, req: AuthenticatedRequest): Promise<import("./review.entity").Review>;
    findByReviewee(id: string): Promise<import("./review.entity").Review[]>;
    findByJob(jobId: string): Promise<import("./review.entity").Review[]>;
    reply(id: string, dto: ReplyReviewDto, req: AuthenticatedRequest): Promise<{
        id: string;
        replyText: string | null;
        repliedAt: Date | null;
    }>;
    addPhotos(id: string, files: Express.Multer.File[], req: AuthenticatedRequest): Promise<import("./review.entity").Review>;
    markHelpful(id: string, req: AuthenticatedRequest): Promise<{
        helpfulCount: number;
    }>;
    findByWorker(workerId: string): Promise<import("./review.entity").Review[]>;
}
