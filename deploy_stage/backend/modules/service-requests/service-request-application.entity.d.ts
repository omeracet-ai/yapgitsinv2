import { ServiceRequest } from './service-request.entity';
import { User } from '../users/user.entity';
export declare enum ApplicationStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected"
}
export declare class ServiceRequestApplication {
    id: string;
    serviceRequestId: string;
    serviceRequest: ServiceRequest;
    userId: string;
    user: User;
    message: string | null;
    price: number | null;
    status: ApplicationStatus;
    createdAt: Date;
    updatedAt: Date;
}
