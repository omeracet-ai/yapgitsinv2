import { DataSource, Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { Offer } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { TokensService } from '../tokens/tokens.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EscrowService } from '../escrow/escrow.service';
import { CancellationService } from '../cancellation/cancellation.service';
import { DisputesService } from '../disputes/disputes.service';
import { DisputeType } from '../disputes/job-dispute.entity';
import { FraudDetectionService } from '../ai/fraud-detection.service';
import { CategorySubscriptionsService } from '../subscriptions/category-subscriptions.service';
export declare const BOOST_TOKEN_COST_PER_DAY = 10;
export declare const BOOST_ALLOWED_DAYS: readonly [3, 7, 14];
export declare class JobsService {
    private jobsRepository;
    private offersRepository;
    private usersService;
    private dataSource;
    private notificationsService;
    private escrowService;
    private cancellationService;
    private disputesService;
    private tokensService;
    private fraudDetection;
    private categorySubsService;
    private readonly logger;
    constructor(jobsRepository: Repository<Job>, offersRepository: Repository<Offer>, usersService: UsersService, dataSource: DataSource, notificationsService: NotificationsService, escrowService: EscrowService, cancellationService: CancellationService, disputesService: DisputesService, tokensService: TokensService, fraudDetection: FraudDetectionService, categorySubsService: CategorySubscriptionsService);
    private _notifyCategorySubscribers;
    boost(jobId: string, days: number, userId: string): Promise<Job>;
    onModuleInit(): Promise<void>;
    findAll(filters?: {
        category?: string;
        status?: JobStatus;
        limit?: number;
        page?: number;
        customerId?: string;
        q?: string;
    }): Promise<{
        data: Job[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Job>;
    findOne(id: string): Promise<Job>;
    create(createJobDto: CreateJobDto, customerId: string): Promise<Job>;
    update(id: string, updateJobDto: UpdateJobDto, requesterId?: string): Promise<Job>;
    submitCompletion(jobId: string, taskerId: string): Promise<Job>;
    approveCompletion(jobId: string, customerId: string): Promise<Job>;
    raiseDispute(jobId: string, requesterId: string, payload: {
        disputeType: DisputeType;
        reason: string;
        evidenceUrls?: string[];
    }): Promise<Job>;
    private _trackStatusChange;
    findNearby(lat: number, lng: number, radiusKm?: number, category?: string): Promise<(Job & {
        distanceKm: number;
    })[]>;
    remove(id: string, requesterId?: string): Promise<void>;
    generateQr(id: string, requesterId: string): Promise<{
        qrCode: string;
    }>;
    verifyQr(id: string, qrCode: string, requesterId: string): Promise<{
        success: boolean;
    }>;
    completeJobWithPayment(id: string, requesterId: string): Promise<Job>;
    uploadPhotosBulk(jobId: string, files: Express.Multer.File[], userId: string): Promise<{
        photos: string[];
    }>;
}
