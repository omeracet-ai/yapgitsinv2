export declare enum DataDeletionRequestStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    COMPLETED = "completed"
}
export declare class DataDeletionRequest {
    id: string;
    userId: string;
    reason: string | null;
    status: DataDeletionRequestStatus;
    createdAt: Date;
    scheduledDeletionAt: Date;
    processedAt: Date | null;
    processedBy: string | null;
    adminNote: string | null;
}
