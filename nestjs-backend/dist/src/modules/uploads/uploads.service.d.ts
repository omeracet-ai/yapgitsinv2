import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { Offer } from '../jobs/offer.entity';
export declare class UploadsService {
    private readonly jobsRepository;
    private readonly offersRepository;
    constructor(jobsRepository: Repository<Job>, offersRepository: Repository<Offer>);
    uploadCompletionPhotos(jobId: string, files: Express.Multer.File[], userId: string): Promise<{
        photos: string[];
    }>;
    uploadProfileVideo(file: Express.Multer.File, userId: string, durationSeconds?: number): Promise<{
        url: string;
        duration?: number;
    }>;
}
