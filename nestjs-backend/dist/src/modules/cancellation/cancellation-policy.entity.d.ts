export declare enum CancellationAppliesTo {
    CUSTOMER_CANCEL = "customer_cancel",
    TASKER_CANCEL = "tasker_cancel",
    MUTUAL_CANCEL = "mutual_cancel",
    DISPUTE_RESOLVED_CUSTOMER = "dispute_resolved_customer",
    DISPUTE_RESOLVED_TASKER = "dispute_resolved_tasker"
}
export declare enum CancellationAppliesAtStage {
    BEFORE_ASSIGNMENT = "before_assignment",
    AFTER_ASSIGNMENT = "after_assignment",
    IN_PROGRESS = "in_progress",
    PENDING_COMPLETION = "pending_completion",
    ANY = "any"
}
export declare class CancellationPolicy {
    id: string;
    name: string;
    appliesTo: CancellationAppliesTo;
    appliesAtStage: CancellationAppliesAtStage;
    minHoursElapsed: number;
    maxHoursElapsed: number | null;
    refundPercentage: number;
    taskerCompensationPercentage: number;
    platformFeePercentage: number;
    priority: number;
    isActive: boolean;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
