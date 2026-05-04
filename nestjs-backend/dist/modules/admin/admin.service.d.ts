import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { ServiceRequest } from '../service-requests/service-request.entity';
export declare class AdminService {
    private jobsRepo;
    private usersRepo;
    private srRepo;
    constructor(jobsRepo: Repository<Job>, usersRepo: Repository<User>, srRepo: Repository<ServiceRequest>);
    getDashboardStats(): Promise<{
        totalJobs: number;
        totalUsers: number;
        totalServiceRequests: number;
        openServiceRequests: number;
    }>;
    getRecentJobs(limit?: number): Promise<Job[]>;
    getAllUsers(): Promise<User[]>;
    getAllServiceRequests(limit?: number): Promise<ServiceRequest[]>;
    setServiceRequestFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    setJobFeaturedOrder(id: string, featuredOrder: number | null): Promise<import("typeorm").UpdateResult>;
    verifyUser(id: string, identityVerified: boolean): Promise<import("typeorm").UpdateResult>;
}
