import { ServiceRequestsService } from './service-requests.service';
import { ApplicationStatus } from './service-request-application.entity';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
export declare class ServiceRequestsController {
    private readonly svc;
    constructor(svc: ServiceRequestsService);
    findAll(category?: string): Promise<import("./service-request.entity").ServiceRequest[]>;
    findMine(req: AuthenticatedRequest): Promise<import("./service-request.entity").ServiceRequest[]>;
    findOne(id: string): Promise<import("./service-request.entity").ServiceRequest | null>;
    create(req: AuthenticatedRequest, body: {
        title?: string;
        description?: string;
        category?: string;
        categoryId?: string;
        location?: string;
        address?: string;
        imageUrl?: string;
        price?: number;
        latitude?: number;
        longitude?: number;
    }): Promise<import("./service-request.entity").ServiceRequest>;
    update(id: string, req: AuthenticatedRequest, body: Record<string, unknown>): Promise<import("./service-request.entity").ServiceRequest>;
    remove(id: string, req: AuthenticatedRequest): Promise<void>;
    convertToJob(id: string, req: AuthenticatedRequest): Promise<{
        jobId: string;
        message: string;
    }>;
    getMyApplications(req: AuthenticatedRequest): Promise<import("./service-request-application.entity").ServiceRequestApplication[]>;
    apply(id: string, req: AuthenticatedRequest, body: {
        message?: string;
        price?: number;
    }): Promise<import("./service-request-application.entity").ServiceRequestApplication>;
    getApplications(id: string): Promise<import("./service-request-application.entity").ServiceRequestApplication[]>;
    updateAppStatus(appId: string, req: AuthenticatedRequest, body: {
        status: ApplicationStatus;
    }): Promise<import("./service-request-application.entity").ServiceRequestApplication>;
}
