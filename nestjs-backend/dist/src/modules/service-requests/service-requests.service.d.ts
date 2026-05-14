import { DataSource, Repository } from 'typeorm';
import { ServiceRequest } from './service-request.entity';
import { ServiceRequestApplication, ApplicationStatus } from './service-request-application.entity';
import { Job } from '../jobs/job.entity';
export declare class ServiceRequestsService {
    private repo;
    private appRepo;
    private jobRepo;
    private dataSource;
    constructor(repo: Repository<ServiceRequest>, appRepo: Repository<ServiceRequestApplication>, jobRepo: Repository<Job>, dataSource: DataSource);
    convertToJob(srId: string, userId: string): Promise<{
        jobId: string;
        message: string;
    }>;
    findAll(category?: string): Promise<ServiceRequest[]>;
    findById(id: string): Promise<ServiceRequest | null>;
    findByUser(userId: string): Promise<ServiceRequest[]>;
    create(userId: string, data: Partial<ServiceRequest>): Promise<ServiceRequest>;
    update(id: string, userId: string, data: Partial<ServiceRequest>): Promise<ServiceRequest>;
    remove(id: string, userId: string): Promise<void>;
    setFeaturedOrder(id: string, featuredOrder: number | null): Promise<void>;
    createApplication(serviceRequestId: string, userId: string, data: {
        message?: string;
        price?: number;
    }): Promise<ServiceRequestApplication>;
    getApplications(serviceRequestId: string): Promise<ServiceRequestApplication[]>;
    getMyApplications(userId: string): Promise<ServiceRequestApplication[]>;
    updateApplicationStatus(applicationId: string, requestUserId: string, status: ApplicationStatus): Promise<ServiceRequestApplication>;
}
