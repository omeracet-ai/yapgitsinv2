import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { UsersService } from '../users/users.service';
export declare class ReviewsService {
    private reviewsRepository;
    private usersService;
    constructor(reviewsRepository: Repository<Review>, usersService: UsersService);
    create(data: Partial<Review>): Promise<Review>;
    findByReviewee(revieweeId: string): Promise<Review[]>;
    findByJob(jobId: string): Promise<Review[]>;
}
