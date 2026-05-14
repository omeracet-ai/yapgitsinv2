import { GeneralDisputesService } from './general-disputes.service';
import type { CreateDisputeDto, ResolveDisputeDto } from './general-disputes.service';
import { GeneralDisputeStatus } from './dispute.entity';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
interface JwtRequest {
    user: {
        sub?: string;
        userId?: string;
        id?: string;
        role?: string;
    };
}
export declare class GeneralDisputesController {
    private readonly svc;
    constructor(svc: GeneralDisputesService);
    create(req: JwtRequest, body: CreateDisputeDto): Promise<import("./dispute.entity").Dispute>;
    mine(req: JwtRequest): Promise<import("./dispute.entity").Dispute[]>;
}
export declare class AdminGeneralDisputesController {
    private readonly svc;
    private readonly audit;
    constructor(svc: GeneralDisputesService, audit: AdminAuditService);
    list(req: JwtRequest, status?: GeneralDisputeStatus, page?: string, limit?: string): Promise<{
        data: import("./dispute.entity").Dispute[];
        total: number;
        page: number;
        limit: number;
        pages: number;
    }>;
    resolve(req: JwtRequest, id: string, body: ResolveDisputeDto): Promise<import("./dispute.entity").Dispute>;
}
export {};
