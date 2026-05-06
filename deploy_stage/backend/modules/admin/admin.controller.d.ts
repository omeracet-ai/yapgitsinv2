import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { ProvidersService } from '../providers/providers.service';
import { Category } from '../categories/category.entity';
export declare class AdminController {
    private readonly adminService;
    private readonly categoriesService;
    private readonly providersService;
    constructor(adminService: AdminService, categoriesService: CategoriesService, providersService: ProvidersService);
    getStats(): Promise<{
        totalJobs: number;
        openJobs: number;
        completedJobs: number;
        totalUsers: number;
        totalWorkers: number;
        verifiedWorkers: number;
        totalServiceRequests: number;
        openServiceRequests: number;
        totalOffers: number;
        totalBookings: number;
        totalReviews: number;
        chartData: {
            jobsPerDay: {
                date: string;
                count: number;
            }[];
            usersPerDay: {
                date: string;
                count: number;
            }[];
        };
    }>;
    getRecentJobs(limit?: string): Promise<import("../jobs/job.entity").Job[]>;
    setJobFeatured(id: string, body: {
        featuredOrder: number | null;
    }): Promise<import("typeorm").UpdateResult>;
    getUsers(): Promise<import("../users/user.entity").User[]>;
    verifyUser(id: string, body: {
        identityVerified: boolean;
    }): Promise<import("typeorm").UpdateResult>;
    getServiceRequests(limit?: string): Promise<import("../service-requests/service-request.entity").ServiceRequest[]>;
    setServiceRequestFeatured(id: string, body: {
        featuredOrder: number | null;
    }): Promise<import("typeorm").UpdateResult>;
    getCategories(): Promise<Category[]>;
    updateCategory(id: string, body: Partial<Category>): Promise<Category>;
    getProviders(): Promise<import("../providers/provider.entity").Provider[]>;
    verifyProvider(id: string, body: {
        isVerified: boolean;
    }): Promise<import("../providers/provider.entity").Provider>;
    setProviderFeatured(id: string, body: {
        featuredOrder: number | null;
    }): Promise<import("../providers/provider.entity").Provider>;
}
