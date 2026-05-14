export declare enum GeneralDisputeType {
    QUALITY = "quality",
    PAYMENT = "payment",
    NO_SHOW = "no_show",
    FRAUD = "fraud",
    OTHER = "other"
}
export declare enum GeneralDisputeStatus {
    OPEN = "open",
    IN_REVIEW = "in_review",
    RESOLVED = "resolved",
    DISMISSED = "dismissed"
}
export declare class Dispute {
    id: string;
    jobId: string | null;
    bookingId: string | null;
    raisedBy: string;
    againstUserId: string;
    type: GeneralDisputeType;
    description: string;
    status: GeneralDisputeStatus;
    resolution: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
    aiAnalysis: {
        fairnessScore: number;
        fraudRisk: 'low' | 'medium' | 'high';
        suggestedAction: 'refund' | 'partial_refund' | 'cancel' | 'dismiss' | 'escalate';
        reasoning: string;
        analyzedAt: string;
    } | null;
    createdAt: Date;
}
