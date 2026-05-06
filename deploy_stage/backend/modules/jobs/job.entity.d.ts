import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
export declare enum JobStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class Job {
    id: string;
    title: string;
    description: string;
    category: string;
    categoryId: string | null;
    categoryRef: Category;
    location: string;
    budgetMin: number;
    budgetMax: number;
    status: JobStatus;
    customerId: string;
    customer: User;
    photos: string[] | null;
    videos: string[] | null;
    latitude: number | null;
    longitude: number | null;
    dueDate: string | null;
    qrCode: string | null;
    isQrVerified: boolean;
    endJobPhotos: string[] | null;
    endJobVideos: string[] | null;
    featuredOrder: number | null;
    createdAt: Date;
    updatedAt: Date;
}
