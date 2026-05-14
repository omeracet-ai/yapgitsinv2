import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
export declare enum JobStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    PENDING_COMPLETION = "pending_completion",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed"
}
export declare const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]>;
export declare function isValidTransition(from: JobStatus, to: JobStatus): boolean;
export declare class Job {
    id: string;
    tenantId: string | null;
    title: string;
    description: string;
    category: string;
    categoryId: string | null;
    categoryRef: Category;
    location: string;
    budgetMin: number;
    budgetMax: number;
    budgetMinMinor: number | null;
    budgetMaxMinor: number | null;
    status: JobStatus;
    customerId: string;
    customer: User;
    photos: string[] | null;
    videos: string[] | null;
    latitude: number | null;
    longitude: number | null;
    geohash: string | null;
    dueDate: string | null;
    qrCode: string | null;
    isQrVerified: boolean;
    endJobPhotos: string[] | null;
    endJobVideos: string[] | null;
    completionPhotos: string[] | null;
    featuredOrder: number | null;
    featuredUntil: Date | null;
    flagged: boolean;
    flagReason: string | null;
    fraudScore: number | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
