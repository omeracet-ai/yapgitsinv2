import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { ReviewHelpful } from './review-helpful.entity';
import { UsersService } from '../users/users.service';
import { FraudDetectionService } from '../ai/fraud-detection.service';
export declare class ReviewsService {
    private reviewsRepository;
    private helpfulRepository;
    private usersService;
    private fraudDetection;
    constructor(reviewsRepository: Repository<Review>, helpfulRepository: Repository<ReviewHelpful>, usersService: UsersService, fraudDetection: FraudDetectionService);
    create(data: Partial<Review>): Promise<Review>;
    findByReviewee(revieweeId: string): Promise<Review[]>;
    findByJob(jobId: string): Promise<Review[]>;
    addPhotos(reviewId: string, userId: string, photoUrls: string[]): Promise<Review>;
    markHelpful(reviewId: string, userId: string): Promise<{
        helpfulCount: number;
    }>;
    addOrUpdateReply(reviewId: string, userId: string, text: string): Promise<{
        id: string;
        replyText: string | null;
        repliedAt: Date | null;
    }>;
}
