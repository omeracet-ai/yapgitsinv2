import { JobsService } from './jobs.service';
import { OffersService } from './offers.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobStatus } from './job.entity';
export declare class JobsController {
    private readonly jobsService;
    private readonly offersService;
    constructor(jobsService: JobsService, offersService: OffersService);
    findAll(category?: string, status?: JobStatus, limit?: string, customerId?: string): Promise<import("./job.entity").Job[]>;
    getMyOffers(req: any): Promise<import("./offer.entity").Offer[]>;
    getNotifications(req: any): Promise<{
        id: string;
        type: string;
        title: string;
        body: string;
        jobId: any;
        jobTitle: any;
        price: number;
        counterPrice: number | null;
        status: import("./offer.entity").OfferStatus;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<any>;
    create(createJobDto: CreateJobDto, req: any): Promise<import("./job.entity").Job>;
    update(id: string, updateJobDto: UpdateJobDto): Promise<import("./job.entity").Job>;
    remove(id: string): Promise<void>;
}
