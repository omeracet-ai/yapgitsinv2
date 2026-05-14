import { Repository } from 'typeorm';
import { WorkerInsurance } from './worker-insurance.entity';
export interface UpsertInsuranceDto {
    policyNumber: string;
    provider: string;
    coverageAmount: number;
    expiresAt: string | Date;
    documentUrl?: string | null;
}
export declare class WorkerInsuranceService {
    private repo;
    constructor(repo: Repository<WorkerInsurance>);
    getByUserId(userId: string): Promise<WorkerInsurance | null>;
    upsert(userId: string, dto: UpsertInsuranceDto): Promise<WorkerInsurance>;
    remove(userId: string): Promise<{
        ok: true;
    }>;
    setVerified(userId: string, verified: boolean, adminId: string): Promise<WorkerInsurance>;
    isInsured(ins: WorkerInsurance | null | undefined): boolean;
    toPublic(ins: WorkerInsurance): {
        provider: string;
        coverageAmount: number;
        expiresAt: Date;
        verified: boolean;
    };
}
