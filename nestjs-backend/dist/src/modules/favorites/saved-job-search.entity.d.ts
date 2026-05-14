import { User } from '../users/user.entity';
export interface SavedJobSearchCriteria {
    category?: string;
    city?: string;
    budgetMin?: number;
    budgetMax?: number;
    radiusKm?: number;
    lat?: number;
    lng?: number;
    keywords?: string;
}
export declare class SavedJobSearch {
    id: string;
    userId: string;
    user: User;
    name: string;
    criteria: SavedJobSearchCriteria;
    alertEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastNotifiedAt: Date | null;
}
