import { JobsService } from './jobs.service';
import { OffersService } from './offers.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobStatus } from './job.entity';
import { OfferStatus } from './offer.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class JobsController {
    private readonly jobsService;
    private readonly offersService;
    constructor(jobsService: JobsService, offersService: OffersService);
    findAll(category?: string, status?: JobStatus, limit?: string, page?: string, customerId?: string): Promise<{
        data: import("./job.entity").Job[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getMyOffers(req: AuthenticatedRequest, page?: string, limit?: string): Promise<{
        data: import("./offer.entity").Offer[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    getNotifications(req: AuthenticatedRequest): Promise<{
        id: string;
        type: string;
        title: string;
        body: string;
        jobId: string | null;
        jobTitle: string;
        price: number;
        counterPrice: number | null;
        status: OfferStatus;
        createdAt: Date;
    }[]>;
    findNearby(lat: string, lng: string, radiusKm?: string, category?: string): Promise<(import("./job.entity").Job & {
        distanceKm: number;
    })[]>;
    findOne(id: string): Promise<import("./job.entity").Job>;
    create(createJobDto: CreateJobDto, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    update(id: string, updateJobDto: UpdateJobDto, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    remove(id: string, req: AuthenticatedRequest): Promise<void>;
    generateQr(id: string, req: AuthenticatedRequest): Promise<{
        qrCode: string;
    }>;
    verifyQr(id: string, qrCode: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
    completeJob(id: string, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
}
