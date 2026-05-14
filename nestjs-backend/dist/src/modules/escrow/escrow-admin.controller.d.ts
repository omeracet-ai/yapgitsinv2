import { EscrowService } from './escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
declare class AdminResolveDto {
    action: 'release' | 'refund' | 'split';
    splitRatio?: number;
    reason?: string;
    adminNote?: string;
}
declare class AdminReasonDto {
    reason?: string;
}
declare class AdminRefundDto {
    amount?: number;
    reason?: string;
}
export declare class EscrowAdminController {
    private readonly svc;
    constructor(svc: EscrowService);
    private assertAdmin;
    listAll(req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow[]>;
    resolve(id: string, dto: AdminResolveDto, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow>;
    release(id: string, dto: AdminReasonDto, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow & {
        feeBreakdown: import("./fee.service").FeeBreakdown;
    }>;
    refund(id: string, dto: AdminRefundDto, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow>;
}
export {};
