import { ServiceRequestsService } from './service-requests.service';
export declare class ServiceRequestsController {
    private readonly svc;
    constructor(svc: ServiceRequestsService);
    findAll(category?: string): Promise<import("./service-request.entity").ServiceRequest[]>;
    findMine(req: any): Promise<import("./service-request.entity").ServiceRequest[]>;
    findOne(id: string): Promise<import("./service-request.entity").ServiceRequest | null>;
    create(req: any, body: any): Promise<import("./service-request.entity").ServiceRequest>;
    update(id: string, req: any, body: any): Promise<import("./service-request.entity").ServiceRequest>;
    remove(id: string, req: any): Promise<void>;
    getMyApplications(req: any): Promise<import("./service-request-application.entity").ServiceRequestApplication[]>;
    apply(id: string, req: any, body: {
        message?: string;
        price?: number;
    }): Promise<import("./service-request-application.entity").ServiceRequestApplication>;
    getApplications(id: string): Promise<import("./service-request-application.entity").ServiceRequestApplication[]>;
    updateAppStatus(appId: string, req: any, body: {
        status: 'accepted' | 'rejected';
    }): Promise<import("./service-request-application.entity").ServiceRequestApplication>;
}
