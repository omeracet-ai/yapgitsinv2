import { Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { Offer } from './offer.entity';
import { UsersService } from '../users/users.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
export declare class JobsService {
    private jobsRepository;
    private offersRepository;
    private usersService;
    constructor(jobsRepository: Repository<Job>, offersRepository: Repository<Offer>, usersService: UsersService);
    onModuleInit(): Promise<void>;
    findAll(filters?: {
        category?: string;
        status?: JobStatus;
        limit?: number;
        customerId?: string;
    }): Promise<Job[]>;
    setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Job>;
    findOne(id: string): Promise<any>;
    create(createJobDto: CreateJobDto, customerId: string): Promise<Job>;
    update(id: string, updateJobDto: UpdateJobDto): Promise<Job>;
    private _trackStatusChange;
    remove(id: string): Promise<void>;
}
