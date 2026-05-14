export declare enum DisputeType {
    QUALITY = "quality",
    PAYMENT = "payment",
    NON_DELIVERY = "non_delivery",
    INCOMPLETE = "incomplete",
    OTHER = "other"
}
export declare enum DisputeResolutionStatus {
    OPEN = "open",
    UNDER_REVIEW = "under_review",
    RESOLVED_CUSTOMER = "resolved_customer",
    RESOLVED_TASKER = "resolved_tasker",
    RESOLVED_SPLIT = "resolved_split",
    DISMISSED = "dismissed"
}
export declare class JobDispute {
    id: string;
    jobId: string;
    raisedByUserId: string;
    counterPartyUserId: string;
    escrowId: string | null;
    disputeType: DisputeType;
    reason: string;
    evidenceUrls: string[] | null;
    resolutionStatus: DisputeResolutionStatus;
    resolutionNotes: string | null;
    resolvedByAdminId: string | null;
    refundAmount: number | null;
    taskerCompensationAmount: number | null;
    raisedAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
