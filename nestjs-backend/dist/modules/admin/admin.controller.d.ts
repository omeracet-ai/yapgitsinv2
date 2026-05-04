import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';
export declare class AdminController {
    private readonly adminService;
    private readonly categoriesService;
    constructor(adminService: AdminService, categoriesService: CategoriesService);
    getStats(): Promise<{
        totalJobs: number;
        totalUsers: number;
        totalServiceRequests: number;
        openServiceRequests: number;
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
}
