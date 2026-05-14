import { Repository } from 'typeorm';
import { DisputeResolutionStatus, DisputeType, JobDispute } from './job-dispute.entity';
import { EscrowService } from '../escrow/escrow.service';
export interface CreateDisputeDto {
    jobId: string;
    raisedByUserId: string;
    counterPartyUserId: string;
    escrowId?: string | null;
    disputeType: DisputeType;
    reason: string;
    evidenceUrls?: string[] | null;
}
export interface ResolveDisputeDto {
    status: DisputeResolutionStatus.RESOLVED_CUSTOMER | DisputeResolutionStatus.RESOLVED_TASKER | DisputeResolutionStatus.RESOLVED_SPLIT;
    notes: string;
    refundAmount?: number;
    taskerCompensationAmount?: number;
}
export declare class DisputesService {
    private readonly repo;
    private readonly escrowService;
    private readonly logger;
    constructor(repo: Repository<JobDispute>, escrowService: EscrowService);
    create(dto: CreateDisputeDto): Promise<JobDispute>;
    findOpenDisputes(): Promise<JobDispute[]>;
    findById(id: string, requesterId: string, isAdmin: boolean): Promise<JobDispute>;
    findByJob(jobId: string): Promise<JobDispute[]>;
    findMine(userId: string): Promise<JobDispute[]>;
    markUnderReview(id: string, adminId: string): Promise<JobDispute>;
    resolve(id: string, adminId: string, dto: ResolveDisputeDto): Promise<JobDispute>;
    dismiss(id: string, adminId: string, notes: string): Promise<JobDispute>;
    applyResolution(disputeId: string, adminId: string, decision: ResolveDisputeDto): Promise<void>;
}
