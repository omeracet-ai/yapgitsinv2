export declare class WorkerCertification {
    id: string;
    userId: string;
    name: string;
    issuer: string;
    issuedAt: Date;
    expiresAt: Date | null;
    documentUrl: string | null;
    verified: boolean;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    adminNote: string | null;
    createdAt: Date;
}
