import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { Job } from '../jobs/job.entity';
import { Review } from '../reviews/review.entity';
import { Offer } from '../jobs/offer.entity';
export declare class UsersController {
    private readonly svc;
    private jobsRepo;
    private reviewsRepo;
    private offersRepo;
    constructor(svc: UsersService, jobsRepo: Repository<Job>, reviewsRepo: Repository<Review>, offersRepo: Repository<Offer>);
    getMe(req: any): Promise<any>;
    updateMe(req: any, body: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
        birthDate?: string;
        gender?: string;
        city?: string;
        district?: string;
        address?: string;
        identityPhotoUrl?: string;
        documentPhotoUrl?: string;
    }): Promise<any>;
    getWorkers(category?: string, city?: string): Promise<any[]>;
    getPublicProfile(id: string): Promise<any>;
}
