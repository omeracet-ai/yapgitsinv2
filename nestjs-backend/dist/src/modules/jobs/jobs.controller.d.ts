import { JobsService } from './jobs.service';
import { OffersService } from './offers.service';
import { SavedJobsService } from './saved-jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JobStatus } from './job.entity';
import { OfferStatus } from './offer.entity';
import { DisputeType } from '../disputes/job-dispute.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class JobsController {
    private readonly jobsService;
    private readonly offersService;
    private readonly savedJobsService;
    constructor(jobsService: JobsService, offersService: OffersService, savedJobsService: SavedJobsService);
    listSavedJobs(req: AuthenticatedRequest): Promise<{
        data: import("./saved-jobs.service").SavedJobPublic[];
        total: number;
    }>;
    saveJob(req: AuthenticatedRequest, jobId: string): Promise<{
        saved: true;
        jobId: string;
    }>;
    unsaveJob(req: AuthenticatedRequest, jobId: string): Promise<{
        saved: false;
        jobId: string;
    }>;
    findAll(category?: string, status?: JobStatus, limit?: string, page?: string, customerId?: string, q?: string): Promise<{
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
    submitCompletion(id: string, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    approveCompletion(id: string, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    raiseDispute(id: string, req: AuthenticatedRequest, body: {
        disputeType: DisputeType;
        reason: string;
        evidenceUrls?: string[];
    }): Promise<import("./job.entity").Job>;
    generateQr(id: string, req: AuthenticatedRequest): Promise<{
        qrCode: string;
    }>;
    verifyQr(id: string, qrCode: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
    completeJob(id: string, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    boost(id: string, body: {
        days: number;
    }, req: AuthenticatedRequest): Promise<import("./job.entity").Job>;
    uploadJobPhotosBulk(id: string, files: Express.Multer.File[], req: AuthenticatedRequest): Promise<{
        photos: string[];
    }>;
}
