import { DisputesService } from './disputes.service';
import type { ResolveDisputeDto } from './disputes.service';
interface JwtRequest {
    user: {
        sub: string;
        userId?: string;
        role?: string;
    };
}
export declare class AdminDisputesController {
    private readonly svc;
    constructor(svc: DisputesService);
    list(req: JwtRequest): Promise<import("./job-dispute.entity").JobDispute[]>;
    detail(req: JwtRequest, id: string): Promise<import("./job-dispute.entity").JobDispute>;
    markUnderReview(req: JwtRequest, id: string): Promise<import("./job-dispute.entity").JobDispute>;
    resolve(req: JwtRequest, id: string, body: ResolveDisputeDto): Promise<import("./job-dispute.entity").JobDispute>;
    dismiss(req: JwtRequest, id: string, body: {
        notes: string;
    }): Promise<import("./job-dispute.entity").JobDispute>;
}
export declare class DisputesController {
    private readonly svc;
    constructor(svc: DisputesService);
    my(req: JwtRequest): Promise<import("./job-dispute.entity").JobDispute[]>;
    byJob(jobId: string): Promise<import("./job-dispute.entity").JobDispute[]>;
    detail(req: JwtRequest, id: string): Promise<import("./job-dispute.entity").JobDispute>;
}
export {};
