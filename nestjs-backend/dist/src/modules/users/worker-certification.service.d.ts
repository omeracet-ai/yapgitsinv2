import { Repository } from 'typeorm';
import { WorkerCertification } from './worker-certification.entity';
export interface CreateCertificationDto {
    name: string;
    issuer: string;
    issuedAt: string | Date;
    expiresAt?: string | Date | null;
    documentUrl?: string | null;
}
export declare class WorkerCertificationService {
    private repo;
    constructor(repo: Repository<WorkerCertification>);
    listOwn(userId: string): Promise<WorkerCertification[]>;
    listPublic(userId: string): Promise<WorkerCertification[]>;
    create(userId: string, dto: CreateCertificationDto): Promise<WorkerCertification>;
    deleteOwn(userId: string, certId: string): Promise<{
        ok: true;
    }>;
    listPending(): Promise<WorkerCertification[]>;
    setVerified(certId: string, verified: boolean, adminId: string, adminNote?: string): Promise<WorkerCertification>;
    hasVerifiedCertification(userId: string): Promise<boolean>;
    toPublic(c: WorkerCertification): {
        name: string;
        issuer: string;
        issuedAt: Date;
        expiresAt: Date | null;
        verified: boolean;
    };
}
