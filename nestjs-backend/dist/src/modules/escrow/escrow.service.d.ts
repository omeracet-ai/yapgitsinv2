import { Repository } from 'typeorm';
import { PaymentEscrow, EscrowStatus } from './payment-escrow.entity';
import { FeeService, FeeBreakdown } from './fee.service';
import { IyzipayService } from './iyzipay.service';
export declare const ALLOWED_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]>;
export interface HoldArgs {
    jobId: string;
    offerId: string;
    amount: number;
    customerId: string;
    taskerId: string;
    paymentRef?: string;
    paymentProvider?: string;
    paymentToken?: string;
}
export interface InitiateArgs {
    jobId: string;
    offerId: string;
    amount: number;
    customerId: string;
    taskerId: string;
    paymentToken?: string;
    buyer?: {
        name?: string;
        surname?: string;
        email?: string;
        gsmNumber?: string;
        ip?: string;
        city?: string;
    };
}
export interface InitiateResult {
    escrow: PaymentEscrow;
    paymentInitUrl: string | null;
    paymentToken: string | null;
    checkoutFormContent: string | null;
    mock: boolean;
}
export declare function getPlatformFeeRate(): number;
export declare class EscrowService {
    private readonly repo;
    private readonly feeService;
    private readonly iyzipay;
    private readonly logger;
    constructor(repo: Repository<PaymentEscrow>, feeService: FeeService, iyzipay: IyzipayService);
    isValidTransition(from: EscrowStatus, to: EscrowStatus): boolean;
    feeBreakdownFor(escrow: Pick<PaymentEscrow, 'amount'>): FeeBreakdown;
    withFeeBreakdown<T extends PaymentEscrow>(escrow: T): T & {
        feeBreakdown: FeeBreakdown;
    };
    private isAdmin;
    private isParty;
    hold(args: HoldArgs): Promise<PaymentEscrow>;
    initiate(args: InitiateArgs): Promise<InitiateResult>;
    confirmByToken(paymentToken: string): Promise<PaymentEscrow>;
    confirm(paymentToken: string, paymentRef: string): Promise<PaymentEscrow>;
    adminResolve(escrowId: string, action: 'release' | 'refund' | 'split', adminId: string, adminRole: string, options?: {
        splitRatio?: number;
        reason?: string;
        adminNote?: string;
    }): Promise<PaymentEscrow>;
    listMy(userId: string): Promise<PaymentEscrow[]>;
    release(escrowId: string, byUserId: string, reason?: string, byUserRole?: string): Promise<PaymentEscrow>;
    refund(escrowId: string, byUserId: string, amount?: number, reason?: string, byUserRole?: string): Promise<PaymentEscrow>;
    dispute(escrowId: string, byUserId: string, reason?: string): Promise<PaymentEscrow>;
    getById(escrowId: string, requesterId: string, requesterRole?: string): Promise<PaymentEscrow>;
    getByJob(jobId: string, requesterId?: string, requesterRole?: string): Promise<PaymentEscrow | null>;
    listForCustomer(customerId: string): Promise<PaymentEscrow[]>;
    listForTasker(taskerId: string): Promise<PaymentEscrow[]>;
}
