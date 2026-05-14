import { EscrowService } from './escrow.service';
import type { AuthenticatedRequest } from '../../common/types/auth.types';
declare class InitiateEscrowDto {
    jobId: string;
    offerId: string;
    taskerId: string;
    amount: number;
    paymentToken?: string;
}
declare class ConfirmEscrowDto {
    paymentToken: string;
    paymentRef: string;
}
declare class DisputeDto {
    reason?: string;
}
declare class ReleaseDto {
    reason?: string;
}
export declare class EscrowController {
    private readonly svc;
    constructor(svc: EscrowService);
    listMy(req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow[]>;
    initiate(dto: InitiateEscrowDto, req: AuthenticatedRequest): Promise<{
        escrow: import("./payment-escrow.entity").PaymentEscrow & {
            feeBreakdown: import("./fee.service").FeeBreakdown;
        };
        feeBreakdown: import("./fee.service").FeeBreakdown;
        paymentInitUrl: string | null;
        paymentToken: string | null;
        checkoutFormContent: string | null;
        mock: boolean;
    }>;
    confirm(dto: ConfirmEscrowDto): Promise<import("./payment-escrow.entity").PaymentEscrow>;
    release(id: string, dto: ReleaseDto, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow>;
    disputePost(id: string, dto: DisputeDto, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow>;
    listAsCustomer(req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow[]>;
    listAsTasker(req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow[]>;
    getByJob(jobId: string, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow & {
        feeBreakdown: import("./fee.service").FeeBreakdown;
    }>;
    getById(id: string, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow & {
        feeBreakdown: import("./fee.service").FeeBreakdown;
    }>;
    dispute(id: string, body: {
        reason?: string;
    }, req: AuthenticatedRequest): Promise<import("./payment-escrow.entity").PaymentEscrow>;
}
export {};
