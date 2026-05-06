import { DataSource, Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { Offer } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
export declare class JobsService {
    private jobsRepository;
    private offersRepository;
    private usersService;
    private dataSource;
    constructor(jobsRepository: Repository<Job>, offersRepository: Repository<Offer>, usersService: UsersService, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    findAll(filters?: {
        category?: string;
        status?: JobStatus;
        limit?: number;
        page?: number;
        customerId?: string;
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
}
